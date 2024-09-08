import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js").then(function (module) {
    console.log('vision_bundle', module)
    let taskVision = module;
    self.createImageSegmenter = async (canvas) => {
        const audio = await taskVision.FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
        );

        let imageSegmenter = await taskVision.ImageSegmenter.createFromOptions(audio, {
            baseOptions: {
                modelAssetPath:
                    "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite",
                delegate: "GPU"
            },
            canvas: canvas,
            runningMode: "VIDEO",
            outputCategoryMask: false,
            outputConfidenceMasks: true
        });

        return imageSegmenter;
    };
});

let thisWorker = self;
class WebGLRenderer {
    #gl = null;
    #originalImageTexture = null;
    #originalImageFrameBuffer = null;
    #texture0 = null;
    #texture1 = null;
    #frameBuffer0 = null;
    #frameBuffer1 = null;

    #defaultProgramPositionLocation = null;
    #defaultProgramTexcoordLocation = null;
    #virtualBgProgramPositionLocation = null;
    #virtualBgProgramTexcoordLocation = null;
    #virtualBgProgramBgTexcoordLocation = null;
    #chromaKeyProgramPositionLocation = null;
    #chromaKeyProgramTexcoordLocation = null;

    #positionBuffer = null;
    #texcoordBuffer = null;

    #texLoc = null;
    #texture0Loc = null;
    #texture1Loc = null;
    #texWidthLoc = null;
    #texHeightLoc = null;
    #sigmaLoc = null;
    #fb0 = null;
    #fb = null;
    #fb2 = null;
    #tempfb = null;
    #originalFrameTexture = null;
    #originalFrameTexture2 = null;
    #texfb = null;
    #texfb2 = null;
    #textempfb = null;
    #texture0Location = null;
    #texture1Location = null;
    #textures = [];

    #maskTexture = null;
    #bgTexture = null;

    #defaultProgram = null;
    #virtualBgProgram = null;
    #chromaKeyProgram = null;

    #currentProgram = {
        program: null,
        positionLocation: null,
        texcoordLocation: null
    };

    #taskQueue = [];
    #isProcessing = false;

    #currentFrameBuffer = null;
    #currentTexture = null;

    get ctx() {
        return this.#gl;
    }

    static vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    
    uniform vec2 u_resolution;
    uniform float u_flipY;
    
    varying vec2 v_texCoord;
    
    void main() {
       // convert the rectangle from pixels to 0.0 to 1.0
       vec2 zeroToOne = a_position / u_resolution;
    
       // convert from 0->1 to 0->2
       vec2 zeroToTwo = zeroToOne * 2.0;
    
       // convert from 0->2 to -1->+1 (clipspace)
       vec2 clipSpace = zeroToTwo - 1.0;
    
       gl_Position = vec4(clipSpace * vec2(1, u_flipY), 0, 1);
    
       // pass the texCoord to the fragment shader
       // The GPU will interpolate this value between points.
       v_texCoord = a_texCoord;
    }
    `;

    static defaultFragmentShader = `
        precision mediump float;
        
        uniform sampler2D texture;
        uniform float texWidth;
        uniform float texHeight;

        void main(void) {
            vec2 texCoord = vec2(gl_FragCoord.x/texWidth, 1.0 - (gl_FragCoord.y/texHeight));
            gl_FragColor = texture2D(texture, texCoord);
        }
    `;

    static virtualBgFragmengShader = `
    
    precision mediump float;

        varying vec2 v_texCoord;

        uniform sampler2D texture0;
        uniform sampler2D segmentMaskTexture; // Segmentation mask
        uniform sampler2D backgroundTexture; // Background image

        uniform bool hasSegmentMask; // Boolean uniform to indicate if mask is available
        uniform float texWidth;
        uniform float texHeight;

        void main(void) {
            vec2 texCoord = vec2(gl_FragCoord.x/texWidth, 1.0 - (gl_FragCoord.y/texHeight));

            if (hasSegmentMask) {
                vec4 frameTex = texture2D(texture0, v_texCoord);
                vec4 segmentMaskTex = texture2D(segmentMaskTexture, v_texCoord);
                vec4 bgColor = texture2D(backgroundTexture, v_texCoord);

                gl_FragColor = mix(bgColor, frameTex, segmentMaskTex.r);
            } else {
                gl_FragColor = texture2D(texture0, v_texCoord);
            }
        }
    `;


    static chromaKeyFragmentShader = `
    precision mediump float;
    uniform float filtersList[100];

    //start: chroma key filter
uniform sampler2D tex;
uniform sampler2D texture1;
uniform float texWidth;
uniform float texHeight;

varying vec2 v_texCoord;

uniform vec3 keyColor;
uniform float similarity;
uniform float smoothness;
uniform float spill;

// From https://github.com/libretro/glsl-shaders/blob/master/nnedi3/shaders/rgb-to-yuv.glsl
vec2 RGBtoUV(vec3 rgb) {
  return vec2(
    rgb.r * -0.169 + rgb.g * -0.331 + rgb.b *  0.5    + 0.5,
    rgb.r *  0.5   + rgb.g * -0.419 + rgb.b * -0.081  + 0.5
  );
}

vec4 ProcessChromaKey(vec2 texCoord) {
  vec4 rgba = texture2D(tex, texCoord);
  float chromaDist = distance(RGBtoUV(texture2D(tex, texCoord).rgb), RGBtoUV(keyColor));

  float baseMask = chromaDist - similarity;
  float fullMask = pow(clamp(baseMask / smoothness, 0., 1.), 1.5);
  rgba.a = fullMask;

  float spillVal = pow(clamp(baseMask / spill, 0., 1.), 1.5);
  float desat = clamp(rgba.r * 0.2126 + rgba.g * 0.7152 + rgba.b * 0.0722, 0., 1.);
  rgba.rgb = mix(vec3(desat, desat, desat), rgba.rgb, spillVal);

  return rgba;
}
//end: chroma key filter

void main(void) {
    vec2 texCoord = vec2(gl_FragCoord.x/texWidth, 1.0 - (gl_FragCoord.y/texHeight));
    vec4 chromaKey = ProcessChromaKey(v_texCoord);
    mediump vec4 sample = texture2D(tex, v_texCoord);
    //gl_FragColor = vec4(sample.rgb, chromaKey.a * sample.a);
    gl_FragColor = vec4(chromaKey.r, chromaKey.g, chromaKey.b, chromaKey.a * sample.a);
  }
    `;

    constructor(type, canvas) {
        this.init(type, canvas);
    }

    init(type, canvas) {
        const rendererInstance = this;

        console.log('WebGLRenderer const');
        this.canvas = canvas;
        this.lastWidth = 0;
        //this.allSourceFilters = [];

        const gl = canvas.getContext(type, {
            premultipliedAlpha: false,
        });
        this.#gl = gl;

        if (!gl) {
            console.error("WebGL context creation failed.");
        }
        //gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

        this.#defaultProgram = this.createAndSetUpProgram(WebGLRenderer.vertexShaderSource, WebGLRenderer.defaultFragmentShader);
        this.#virtualBgProgram = this.createAndSetUpProgram(WebGLRenderer.vertexShaderSource, WebGLRenderer.virtualBgFragmengShader);
        this.#chromaKeyProgram = this.createAndSetUpProgram(WebGLRenderer.vertexShaderSource, WebGLRenderer.chromaKeyFragmentShader);

        // look up where the vertex data needs to go.
        this.#defaultProgramPositionLocation = gl.getAttribLocation(this.#defaultProgram, "a_position");
        this.#defaultProgramTexcoordLocation = gl.getAttribLocation(this.#defaultProgram, "a_texCoord");
        this.#virtualBgProgramPositionLocation = gl.getAttribLocation(this.#virtualBgProgram, "a_position");
        this.#virtualBgProgramTexcoordLocation = gl.getAttribLocation(this.#virtualBgProgram, "a_texCoord");
        this.#virtualBgProgramBgTexcoordLocation = gl.getAttribLocation(this.#virtualBgProgram, "backgroundTexture");
        this.#chromaKeyProgramPositionLocation = gl.getAttribLocation(this.#chromaKeyProgram, "a_position");
        this.#chromaKeyProgramTexcoordLocation = gl.getAttribLocation(this.#chromaKeyProgram, "a_texCoord");

        // Create a buffer to put three 2d clip space points in
        this.#positionBuffer = gl.createBuffer();
        // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#positionBuffer);

        // provide texture coordinates for the rectangle.
        this.#texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0.0, 0.0,
            1.0, 0.0,
            0.0, 1.0,
            0.0, 1.0,
            1.0, 0.0,
            1.0, 1.0,
        ]), gl.STATIC_DRAW);

        gl.activeTexture(gl.TEXTURE0);
        const fb0 = this.#fb0 = gl.createFramebuffer();
        this.#originalFrameTexture = this.createAndSetupTexture();
        //this.#originalFrameTexture2 = this.createAndSetupTexture();
        //gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        //gl.enable(gl.BLEND);
        //gl.disable(gl.DEPTH_TEST);

        //gl.enable(gl.CULL_FACE);        

        gl.activeTexture(gl.TEXTURE1);
        const fb = this.#fb = gl.createFramebuffer();
        const texfb = this.#texfb = this.createAndSetupTexture();
        const fb2 = this.#fb2 = gl.createFramebuffer();
        const texfb2 = this.#texfb2 = this.createAndSetupTexture();
        const tempfb = this.#tempfb = gl.createFramebuffer();
        const textempfb = this.#textempfb = this.createAndSetupTexture();

        gl.activeTexture(gl.TEXTURE2);
        const maskTexture = this.#maskTexture = this.createAndSetupTexture();
        gl.activeTexture(gl.TEXTURE3);
        //this.#bgTexture = this.createAndSetupTexture();   
        this.#bgTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.#bgTexture);
        // Fill the texture with a 1x1 transparent pixel.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        /* gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.#originalFrameTexture); */
        canvas.addEventListener("contextlost", (event) => {
            console.warn('CONTEXT LOST');
        });
        canvas.addEventListener("webglcontextlost", (event) => {
            console.warn('CONTEXT LOST 2', event);
            //rendererInstance.init(type, canvas); //TODO: implement cleaning textures etc. when track is removed
        });
        canvas.addEventListener("webglcontextrestored", (event) => {
            console.warn('CONTEXT RESTORED');
        });
    }
    createAndSetupTexture() {
        const gl = this.#gl;
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Set up texture so we can render any size image and so we are
        // working with pixels.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        return texture;
    }

    createAndSetUpProgram(vertexShaderCode, fragmentShaderCode) {
        const gl = this.#gl;
        var program = gl.createProgram();
        console.warn('createAndSetUpProgram: gl', gl)
        const vShader = gl.createShader(gl.VERTEX_SHADER);
        console.warn('createAndSetUpProgram: vShader', vShader)
        gl.shaderSource(vShader, vertexShaderCode);
        gl.compileShader(vShader);
        if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(vShader));
        }

        const fShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fShader, fragmentShaderCode);
        gl.compileShader(fShader);
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(fShader));
        }

        gl.attachShader(program, vShader);
        gl.attachShader(program, fShader);
        gl.linkProgram(program);

        return program;
    }

    async draw(frame, callback, closecb) {
        this.latestDrawTime = performance.now();
        //console.log('draw START')
        if (this.#isProcessing) {
            this.#taskQueue.push([frame, callback]);
            console.log('draw add to queue')
            return;
        }
        this.#isProcessing = true;
        const rendererInstance = this;

        this.canvas.width = frame.codedWidth;
        this.canvas.height = frame.codedHeight;
        let frameWidth = frame.codedWidth;
        let frameHeight = frame.codedHeight;


        const gl = this.#gl;

        function useProgram(program, positionLocation, texcoordLocation) {

            gl.useProgram(program);

            // Turn on the position attribute
            gl.enableVertexAttribArray(positionLocation);

            // Bind the position buffer.
            gl.bindBuffer(gl.ARRAY_BUFFER, rendererInstance.#positionBuffer);

            // Set a rectangle the same size as the image.
            setRectangle(gl, 0, 0, frameWidth, frameHeight);
            // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

            // Turn on the texcoord attribute
            gl.enableVertexAttribArray(texcoordLocation);

            // bind the texcoord buffer.
            gl.bindBuffer(gl.ARRAY_BUFFER, rendererInstance.#texcoordBuffer);

            gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

            rendererInstance.#currentProgram = {
                program: program,
                positionLocation: positionLocation,
                texcoordLocation: texcoordLocation
            };
        }

        function setRectangle(gl, x, y, width, height) {
            var x1 = x;
            var x2 = x + width;
            var y1 = y;
            var y2 = y + height;
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                x1, y1,
                x2, y1,
                x1, y2,
                x1, y2,
                x2, y1,
                x2, y2,
            ]), gl.STATIC_DRAW);
        }


        if (rendererInstance.#currentFrameBuffer == rendererInstance.#fb) {
            rendererInstance.#currentFrameBuffer = rendererInstance.#fb2;
            rendererInstance.#currentTexture = rendererInstance.#texfb2;
        } else {
            rendererInstance.#currentFrameBuffer = rendererInstance.#fb;
            rendererInstance.#currentTexture = rendererInstance.#texfb;
        }
        let filtersApplied = false;
        let prevTexture, prevFrameBuffer;
        const error = gl.getError();
        if (error !== gl.NO_ERROR) {
            console.error('WebGL error:', error);
        }
        //console.log('this.allSourceFilters', this.allSourceFilters.length)
        for (let b in this.allSourceFilters) {
            //console.log('for START')
            if (this.allSourceFilters[b].active === false || this.allSourceFilters[b].visibility === false) {
                continue
            }

            filtersApplied = true;
            let filter = this.allSourceFilters[b];
            if (filter.name == 'virtualBg') {
                //console.warn('for bg START', frame.timestamp)
                let virtualBgFilter = filter;

                if (!virtualBgFilter.selfieSegmentation) continue;
                //console.log('for START', virtualBgFilter.processing)
                /* if(virtualBgFilter.processing === true) {
                    //console.log('continue')
                    continue;
                } */
                virtualBgFilter.processing = true;
                //console.log('for continue', virtualBgFilter.processing)


                //gl.bindFramebuffer(gl.FRAMEBUFFER, null);

                //gl.bindFramebuffer(gl.FRAMEBUFFER, rendererInstance.#fb);

                useProgram(this.#virtualBgProgram, this.#virtualBgProgramPositionLocation, this.#virtualBgProgramTexcoordLocation);

                let resolutionLocation = gl.getUniformLocation(this.#virtualBgProgram, "u_resolution");
                let textureSizeLocation = gl.getUniformLocation(this.#virtualBgProgram, "u_textureSize");
                let flipYLocation = gl.getUniformLocation(this.#virtualBgProgram, "u_flipY");

                let texWidthLoc = gl.getUniformLocation(this.#virtualBgProgram, "texWidth");
                let texHeightLoc = gl.getUniformLocation(this.#virtualBgProgram, "texHeight");

                let frameTexLoc = gl.getUniformLocation(this.#virtualBgProgram, "texture0");
                let segmentMaskTexLoc = gl.getUniformLocation(this.#virtualBgProgram, "segmentMaskTexture");
                let hasSegmentMaskLoc = gl.getUniformLocation(rendererInstance.#virtualBgProgram, "hasSegmentMask");
                let bgImageTexLoc = gl.getUniformLocation(rendererInstance.#virtualBgProgram, "backgroundTexture");

                gl.uniform1i(hasSegmentMaskLoc, 0);

                gl.viewport(0, 0, frameWidth, frameHeight);

                gl.uniform2f(resolutionLocation, frameWidth, frameHeight);

                gl.uniform2f(textureSizeLocation, frameWidth, frameHeight);
                gl.uniform1f(texWidthLoc, frameWidth);
                gl.uniform1f(texHeightLoc, frameHeight);


                if (parseInt(b) == 0) {
                    gl.clearColor(1.0, 1.0, 1.0, 1.0)
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                    gl.activeTexture(gl.TEXTURE0)
                    gl.bindTexture(gl.TEXTURE_2D, rendererInstance.#originalFrameTexture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);
                    gl.uniform1i(frameTexLoc, 0);
                } else {
                    gl.activeTexture(gl.TEXTURE0);
                    //gl.bindFramebuffer(gl.FRAMEBUFFER, rendererInstance.#currentFrameBuffer);
                    gl.bindTexture(gl.TEXTURE_2D, rendererInstance.#currentTexture);
                    gl.uniform1i(frameTexLoc, 0);
                }

                gl.uniform1f(flipYLocation, -1);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.blendFunc(gl.SRC_ALPHA, gl.ZERO);
                gl.drawArrays(gl.TRIANGLES, 0, 6)

                let canvas = this.canvas;
                /* const clonedImageBitmap = await createImageBitmap(canvas);
                let frame1 = new VideoFrame(clonedImageBitmap, { timestamp: frame.timestamp });
                //let frame1 = frame.clone();
                thisWorker.postMessage({ cmd: 'check', frame: frame1 }, [frame1])
                frame1.close(); */

                virtualBgFilter.lastTimestamp = frame.timestamp;

                let drawToCanvas = false;
                let startTime = performance.now();

                /*  if(counter >= 100) {

                    continue;
                 } */
                /* let imagebitmap = canvas.transferToImageBitmap()
                self.postMessage({cmd: 'check', frame: imagebitmap}, [imagebitmap]) */
                await new Promise(function (resolve) {
                    //setTimeout(function () {
                    virtualBgFilter.selfieSegmentation.segmentForVideo(canvas, virtualBgFilter.timestampFunc === 0 ? frame.timestamp : performance.now(), function (results) {

                        //console.warn('for bg MID', frame.timestamp)
                        self.segmentationTime = performance.now() - startTime;
                        self.lastSegmentationTime = performance.now();

                        // console.log('draw segmentation end')
                        //const maskImage = await virtualBgFilter.toImageBitmap(results.confidenceMasks[0])
                        useProgram(rendererInstance.#virtualBgProgram, rendererInstance.#virtualBgProgramPositionLocation, rendererInstance.#virtualBgProgramTexcoordLocation);

                        const frameTexLoc = gl.getUniformLocation(rendererInstance.#virtualBgProgram, "texture0");
                        const segmentMaskTexLoc = gl.getUniformLocation(rendererInstance.#virtualBgProgram, "segmentMaskTexture");
                        const bgImageTexLoc = gl.getUniformLocation(rendererInstance.#virtualBgProgram, "backgroundTexture");




                        prevFrameBuffer = rendererInstance.#currentFrameBuffer;
                        prevTexture = rendererInstance.#currentTexture;
                        if (rendererInstance.#currentFrameBuffer == rendererInstance.#fb) {
                            rendererInstance.#currentFrameBuffer = rendererInstance.#fb2;
                            rendererInstance.#currentTexture = rendererInstance.#texfb2;
                        } else {
                            rendererInstance.#currentFrameBuffer = rendererInstance.#fb;
                            rendererInstance.#currentTexture = rendererInstance.#texfb;
                        }

                        
                        //gl.bindTexture(gl.TEXTURE_2D, prevTexture);


                        //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                        gl.activeTexture(gl.TEXTURE0);
                        if (rendererInstance.allSourceFilters[parseInt(b) + 1]) {
                            gl.bindFramebuffer(gl.FRAMEBUFFER, rendererInstance.#currentFrameBuffer);
                            gl.bindTexture(gl.TEXTURE_2D, rendererInstance.#currentTexture);
                            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, frameWidth, frameHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rendererInstance.#currentTexture, 0);

                        } else {
                            drawToCanvas = true;
                        }

                        gl.uniform1i(frameTexLoc, 0);

                        if (parseInt(b) == 0) {
                            //gl.bindTexture(gl.TEXTURE_2D, rendererInstance.#originalFrameTexture);
                            //gl.activeTexture(gl.TEXTURE0)
                            //gl.clearColor(1.0, 1.0, 1.0, 1.0)
                            //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                            //gl.bindTexture(gl.TEXTURE_2D, null);
                            gl.bindTexture(gl.TEXTURE_2D, rendererInstance.#originalFrameTexture);
                            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);
                            gl.uniform1i(frameTexLoc, 0);
                        } else {
                            gl.bindFramebuffer(gl.FRAMEBUFFER, prevFrameBuffer);
                            gl.bindTexture(gl.TEXTURE_2D, prevTexture);
                        }

                        // Tell webgl the viewport setting needed for framebuffer.
                        gl.viewport(0, 0, frameWidth, frameHeight);

                        // Tell the shader the resolution of the framebuffer.
                        gl.uniform2f(resolutionLocation, frameWidth, frameHeight);

                        // set the size of the image
                        gl.uniform2f(textureSizeLocation, frameWidth, frameHeight);
                        gl.uniform1f(texWidthLoc, frameWidth);
                        gl.uniform1f(texHeightLoc, frameHeight);


                        //gl.uniform1i(hasSegmentMaskLoc, 0);
                        gl.activeTexture(gl.TEXTURE3);
                        gl.bindTexture(gl.TEXTURE_2D, rendererInstance.#bgTexture);
                        if(virtualBgFilter.bgImage) {
                            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, virtualBgFilter.bgImage);
                        } else if (virtualBgFilter.replaceWithColor) {
                            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, virtualBgFilter.replaceWithColor);
                        }    
                        gl.uniform1i(bgImageTexLoc, 3)

                        gl.activeTexture(gl.TEXTURE2)
                        let maskTexture = results.confidenceMasks[0].getAsWebGLTexture();
                        gl.bindTexture(gl.TEXTURE_2D, maskTexture);
                        gl.uniform1i(segmentMaskTexLoc, 2);
                        
                        hasSegmentMaskLoc = gl.getUniformLocation(rendererInstance.#virtualBgProgram, "hasSegmentMask");
                        flipYLocation = gl.getUniformLocation(rendererInstance.#virtualBgProgram, "u_flipY");
                        gl.activeTexture(gl.TEXTURE0);
                        gl.uniform1i(hasSegmentMaskLoc, 1);
                        if (drawToCanvas) {
                            gl.uniform1f(flipYLocation, -1);
                            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                        } else {
                            gl.uniform1f(flipYLocation, 1);
                        }
                        gl.blendFunc(gl.SRC_ALPHA, gl.ZERO);
                        gl.drawArrays(gl.TRIANGLES, 0, 6);
                        //console.log('BG SEGMENT DONE', frame.timestamp)
                        resolve();
                    });
                    //}, 1000)

                });
            } else if (filter.name == 'chromaKey') {
                useProgram(this.#chromaKeyProgram, this.#chromaKeyProgramPositionLocation, this.#chromaKeyProgramTexcoordLocation);

                const resolutionLocation = gl.getUniformLocation(this.#chromaKeyProgram, "u_resolution");
                const textureSizeLocation = gl.getUniformLocation(this.#chromaKeyProgram, "u_textureSize");
                const flipYLocation = gl.getUniformLocation(this.#chromaKeyProgram, "u_flipY");

                const texWidthLoc = gl.getUniformLocation(this.#chromaKeyProgram, "texWidth");
                const texHeightLoc = gl.getUniformLocation(this.#chromaKeyProgram, "texHeight");
                const keyColorLoc = gl.getUniformLocation(this.#chromaKeyProgram, "keyColor");
                const similarityLoc = gl.getUniformLocation(this.#chromaKeyProgram, "similarity");
                const smoothnessLoc = gl.getUniformLocation(this.#chromaKeyProgram, "smoothness");
                const spillLoc = gl.getUniformLocation(this.#chromaKeyProgram, "spill");
                const frameTexLoc = gl.getUniformLocation(this.#currentProgram.program, "texture0");

                gl.uniform1i(frameTexLoc, 0);
                // Tell webgl the viewport setting needed for framebuffer.
                gl.viewport(0, 0, frameWidth, frameHeight);
                
                // make this the framebuffer we are rendering to.
                prevFrameBuffer = rendererInstance.#currentFrameBuffer;
                prevTexture = rendererInstance.#currentTexture;
                
                if(rendererInstance.#currentFrameBuffer == rendererInstance.#fb) {
                    rendererInstance.#currentFrameBuffer = rendererInstance.#fb2;
                    rendererInstance.#currentTexture = rendererInstance.#texfb2;
                } else {
                    rendererInstance.#currentFrameBuffer = rendererInstance.#fb;
                    rendererInstance.#currentTexture = rendererInstance.#texfb;
                }

                let drawToCanvas = false;
                
                if (rendererInstance.allSourceFilters[parseInt(b) + 1]) {
                    gl.bindFramebuffer(gl.FRAMEBUFFER, rendererInstance.#currentFrameBuffer);
                    gl.bindTexture(gl.TEXTURE_2D, rendererInstance.#currentTexture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, frameWidth, frameHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rendererInstance.#currentTexture, 0);
                } else {
                    drawToCanvas = true;
                }
                
             
                if(parseInt(b) == 0) {
                    //gl.bindTexture(gl.TEXTURE_2D, null);
                    gl.clearColor(1.0, 1.0, 1.0, 1.0)
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                    gl.activeTexture(gl.TEXTURE0)
                    gl.bindTexture(gl.TEXTURE_2D, this.#originalFrameTexture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);
                } else {
                    gl.activeTexture(gl.TEXTURE0);
                    //gl.bindFramebuffer(gl.FRAMEBUFFER, prevFrameBuffer);
                    gl.bindTexture(gl.TEXTURE_2D, prevTexture); 
                }


                // Tell the shader the resolution of the framebuffer.
                gl.uniform2f(resolutionLocation, frameWidth, frameHeight);

                // set the size of the image
                gl.uniform2f(textureSizeLocation, frameWidth, frameHeight);


                gl.uniform1f(texWidthLoc, frameWidth);
                gl.uniform1f(texHeightLoc, frameHeight);

                const m = filter.smoothless ? filter.keyColor.match(/^#([0-9a-f]{6})$/i)[1] : '#00ff00';
                gl.uniform3f(keyColorLoc, parseInt(m.substr(0, 2), 16) / 255, parseInt(m.substr(2, 2), 16) / 255, parseInt(m.substr(4, 2), 16) / 255);
                const similarity = filter.similarity;
                gl.uniform1f(similarityLoc, parseFloat(similarity));
                const smoothless = filter.smoothless;
                gl.uniform1f(smoothnessLoc, parseFloat(smoothless));
                const spill = filter.spill;
                gl.uniform1f(spillLoc, parseFloat(spill));

                if(drawToCanvas) {
                    gl.uniform1f(flipYLocation, -1);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                } else {
                    gl.uniform1f(flipYLocation, 1);
                }
                gl.drawArrays(gl.TRIANGLES, 0, 6)
            }
        }

        if (this.#currentProgram.program) {
            const flipYLocation = gl.getUniformLocation(this.#currentProgram.program, "u_flipY");
            gl.uniform1f(flipYLocation, -1);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.drawArrays(gl.TRIANGLES, 0, 6)
        }


        frame.close();
        if (callback) callback(filtersApplied);
        //console.log('draw END')
        this.#isProcessing = false;
        if (this.#taskQueue.length != 0) {
            let queueDraw = this.#taskQueue.shift();
            this.draw.apply(rendererInstance, [queueDraw[0], queueDraw[1]])
        }
    }


};

var processor = (function () {
    let tracks = {};
    let allFiltersList = {};
    let tracksFilters = {};

    function addFiltersToTrack(data) {
        console.log('worker: addFiltersToTrack START', data)
        if (!tracks[data.trackId]) {
            return;
        }

        let track = tracks[data.trackId];

        if (data.filterName == 'chromaKey') {
            let filter = new ChromaKeyFilter();
            filter.id = data.id;
            if(data.keyColor) filter.keyColor = data.keyColor;
            if(data.similarity) filter.similarity = data.similarity;
            if(data.smoothless) filter.smoothless = data.smoothless;
            if(data.spill) filter.spill = data.spill;
            tracksFilters[data.trackId].push(filter);
            allFiltersList[filter.id] = filter;
        }

        if (data.filterName == 'virtualBg') {
            let replaceWithColor = data.replaceWithColor;
            if(!replaceWithColor || replaceWithColor == 'transparent') {
                new Uint8Array([0, 0, 0, 0])
            } else {
                replaceWithColor = hexToRgba(data.replaceWithColor);
            }

            let filter = new VirtualBgFilter();
            filter.id = data.id;
            filter.replaceWithColor = replaceWithColor;
            filter.bgImage = data.bgImage;
            filter.timestampFunc = data.timestampFunc; // which timestamp data will be used for segmentation: 0 - VideoFrame.timestamp; 1 - performance.now();
            self.createImageSegmenter(track.canvas).then(function (imageSegmentation) {
                filter.selfieSegmentation = imageSegmentation;
            });
            tracksFilters[data.trackId].push(filter);
            allFiltersList[filter.id] = filter;
        }
    }

    function updateFilterParam(e) {
        for (let i = tracksFilters[e.trackId].length - 1; i >= 0; i--) {
            if (tracksFilters[e.trackId][i].id == e.id) {
                console.log('updateFilterParam', e, tracksFilters[e.trackId][i])

                if(e.paramName == 'replaceWithColor') {
                    tracksFilters[e.trackId][i].replaceWithColor = e.value != 'transparent' ? hexToRgba(e.value) : new Uint8Array([0, 0, 0, 0]);
                } else {
                    tracksFilters[e.trackId][i][e.paramName] = e.value;
                }
                
            }
        }
    }

    function hexToRgba(hex) {
        if(!hex) return;
        // Remove the hash if present
        hex = hex.replace(/^#/, '');
      
        // Parse the hex color components
        const bigint = parseInt(hex, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
      
        // Create a Uint8Array with RGBA values
        const rgba = new Uint8Array([r, g, b, 255]);
      
        return rgba;
      }

    function removeFiltersFromTrack(e) {
        console.log('removeFiltersFromTrack', e)
        console.log('removeFiltersFromTrack2', tracksFilters)
        console.log('removeFiltersFromTrack3', tracksFilters[e.trackId])

        for (let i = tracksFilters[e.trackId].length - 1; i >= 0; i--) {
            console.log('removeFiltersFromTrack3 for', tracksFilters[e.trackId])

            if (tracksFilters[e.trackId][i].id == e.filterId) {
                console.log('removeFiltersFromSource remove', tracksFilters[e.trackId])

                tracksFilters[e.trackId].splice(i, 1);
            }
        }

        allFiltersList[e.id] = null;
    }

    function addTrack(data) {
        if (tracks[data.trackId]) {
            return;
        }

        let offscreenCanvas = new OffscreenCanvas(1, 1);
        let renderer = new WebGLRenderer('webgl2', offscreenCanvas);
        tracksFilters[data.trackId] = [];
        renderer.allSourceFilters = tracksFilters[data.trackId];

        let trackObject = {
            trackId: data.trackId,
            generatedTrackStream: data.generatedTrack,
            trackProcessorStream: data.trackProcessor,
            canvas: offscreenCanvas,
            renderer: renderer,
            filters: tracksFilters[data.trackId],
            stopped: false
        };
        
        tracks[data.trackId] = trackObject
        
        const controller = new AbortController();
        const transformer = new TransformStream({
            async transform(videoFrame, controller) {
                if (!videoFrame) return;
                if(trackObject.stopped) {
                    console.log('worker: stopped 1')
                    videoFrame.close();
                    controller.terminate();
                    return;
                }
                trackObject.canvas.width = videoFrame.codedWidth;
                trackObject.canvas.height = videoFrame.codedHeight;

                trackObject.renderer.draw(videoFrame, async function (filtersApplied) {
                    const newFrame = new VideoFrame(trackObject.canvas, { timestamp: videoFrame.timestamp });
                    if(trackObject.stopped) {
                        console.log('worker: stopped 2')
                        videoFrame.close();
                        controller.terminate();
                        return;
                    }
                    controller.enqueue(newFrame);
                }, function () {

                });
            },
        });

        tracks[data.trackId].controller = controller;
        tracks[data.trackId].transformerStream = transformer;
        tracks[data.trackId].trackProcessorStream.pipeThrough(transformer).pipeTo(tracks[data.trackId].generatedTrackStream, { signal: controller.signal1 });
    }

    function removeTrack(data) {
        console.log('worker: removeTrack')
        tracks[data.trackId].stopped = true;
        tracks[data.trackId].renderer
        tracks[data.trackId] = null;
    }

    function destroy(trackInfo) {
        if (tracksFilters[trackInfo.trackId]) {
            for (let i in tracksFilters[trackInfo.trackId]) {
                let filter = tracksFilters[trackInfo.trackId][i];
                allFiltersList[filter.id] = null;
            }
        }
        tracksFilters[trackInfo.trackId] = null;
        tracks[trackInfo.trackId] = null;
    }

    return {
        addFiltersToTrack: addFiltersToTrack,
        removeFiltersFromTrack: removeFiltersFromTrack,
        updateFilterParam: updateFilterParam,
        destroy: destroy,
        addTrack: addTrack,
        removeTrack: removeTrack
    }
}())

function Filter() {
    this.id = null;
    this.name = null;
    this.trackId = null;
    this.active = null;
    this.visibility = null;
}

function VirtualBgFilter() {
    Filter.call(this);
    this.name = 'virtualBg';
    this.replaceWithColor = null;
    this.bgImage = null;
}

VirtualBgFilter.prototype = Object.create(Filter.prototype);


function ChromaKeyFilter() {
    Filter.call(this);
    this.name = 'chromaKey';
    this.keyColor = '#00ff00';
    this.similarity = 0.4;
    this.smoothless = 0.08;
    this.spill = 0.1;
}
ChromaKeyFilter.prototype = Object.create(Filter.prototype);

self.onmessage = function (e) {
    if (e.data.cmd == "addFiltersToTrack") {
        processor.addFiltersToTrack(e.data);
    } else if (e.data.cmd == "updateFilterParam") {
        processor.updateFilterParam(e.data);
    } else if (e.data.cmd == "removeFilterFromTrack") {
        processor.removeFiltersFromTrack(e.data);
    } else if (e.data.cmd == "destroy") {
        processor.destroy(e.data);
    } else if (e.data.cmd == "addTrack") {
        processor.addTrack(e.data);
    } else if (e.data.cmd == "removeTrack") {
        processor.removeTrack(e.data);
    }
};

