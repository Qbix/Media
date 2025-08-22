(function ($, window, undefined) {

    var _icons = {
        settings: '<svg version="1.1" id="svg111" xml:space="preserve" width="682.66669" height="682.66669" viewBox="0 0 682.66669 682.66669" sodipodi:docname="settings (1).svg" inkscape:version="1.2.1 (9c6d41e, 2022-07-14)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><sodipodi:namedview id="namedview72" pagecolor="#ffffff" bordercolor="#000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="#d1d1d1" showgrid="false" inkscape:zoom="0.90839741" inkscape:cx="117.78986" inkscape:cy="346.76453" inkscape:window-width="1920" inkscape:window-height="1029" inkscape:window-x="0" inkscape:window-y="27" inkscape:window-maximized="1" inkscape:current-layer="g117" /><defs id="defs115"><clipPath clipPathUnits="userSpaceOnUse" id="clipPath125"><path d="M 0,512 H 512 V 0 H 0 Z" id="path123" /></clipPath></defs><g id="g117" transform="matrix(1.3333333,0,0,-1.3333333,0,682.66667)"><path d="m -64.267578,-442.71875 c -25.853717,0 -47.132812,21.27966 -47.132812,47.13281 v 10.96094 c -11.11849,3.55446 -21.82534,8.00409 -32.04102,13.28906 l -7.7539,-7.75195 c -8.8401,-8.85183 -20.84682,-13.81641 -33.33789,-13.81641 -12.48681,0 -24.49375,4.96296 -33.33399,13.81641 -7.30802,7.30802 -15.40104,15.40204 -22.70898,22.70898 -8.84723,8.83905 -13.81055,20.84005 -13.81055,33.32618 0,12.49093 4.96494,24.49508 13.81055,33.33398 4.10462,4.10413 4.88381,4.88394 7.75976,7.75977 -5.28538,10.21593 -9.7363,20.9212 -13.29101,32.03906 h -10.95899 c -25.85371,0 -47.13281,21.28159 -47.13281,47.13476 v 32.13282 c 0,25.85317 21.2791,47.13281 47.13281,47.13281 h 10.95704 c 3.55486,11.11899 8.00732,21.82432 13.29296,32.041014 -2.87624,2.875997 -3.65643,3.656431 -7.76171,7.761719 -8.84474,8.83817 -13.8086,20.84253 -13.8086,33.332031 0,12.487977 4.96477,24.490664 13.81445,33.330079 7.31,7.309995 15.40581,15.4048021 22.7129,22.7128901 8.839,8.8476129 20.84096,13.8085939 33.32617,13.8085939 12.49224,0 24.49847,-4.964769 33.33789,-13.8144533 4.10133,-4.1013309 4.88019,-4.87994392 7.7539,-7.7539062 10.21597,5.285344 20.92288,9.7344764 32.04102,13.2890625 v 10.960937 c 0,25.853154 21.279659,47.132813 47.132812,47.132813 h 32.132812 C -6.2816124,69.28125 15,48.002154 15,22.148437 V 11.1875 C 26.118333,7.6328504 36.824883,3.1819523 47.041016,-2.1035156 c 2.87582,2.87631486 3.654527,3.6564808 7.759765,7.7617187 8.838794,8.8449339 20.843559,13.8085939 33.333985,13.8085939 12.487444,0 24.490074,-4.964182 33.330074,-13.8144533 7.30499,-7.3059798 15.39793,-15.3969269 22.70508,-22.7050777 l 0.008,-0.0078 c 8.84692,-8.839351 13.80664,-20.841111 13.80664,-33.324219 10e-6,-12.488328 -4.96171,-24.49318 -13.80859,-33.332031 l -0.006,-0.0078 -7.7539,-7.751953 c 5.28565,-10.216848 9.73769,-20.923258 13.29296,-32.042968 h 10.95704 c 25.85371,0 47.13476,-21.27964 47.13476,-47.13281 v -32.13282 c 0,-25.85317 -21.28105,-47.13476 -47.13476,-47.13476 h -10.95899 c -3.55494,-11.11802 -8.00597,-21.82343 -13.29101,-32.03906 2.87345,-2.87358 3.65267,-3.65317 7.7539,-7.75391 l 0.006,-0.006 c 8.84653,-8.83939 13.80859,-20.84515 13.80859,-33.33398 10e-6,-12.48353 -4.96112,-24.48479 -13.80859,-33.32422 l -0.006,-0.008 -22.70508,-22.70312 c -8.84068,-8.85242 -20.84381,-13.81641 -33.330074,-13.81641 -12.491609,0 -24.499897,4.96424 -33.339844,13.81446 -4.10133,4.10133 -4.880438,4.88019 -7.753906,7.7539 C 36.825339,-376.62091 26.118493,-381.07054 15,-384.625 v -10.96094 c 0,-25.85371 -21.2810489,-47.13281 -47.134766,-47.13281 z m 0,30 h 32.132812 c 9.638248,0 17.134766,7.49456 17.134766,17.13281 v 22.14844 a 15.0015,15.0015 0 0 0 11.2519531,14.52539 c 16.2963859,4.20475 31.6898509,10.66041 45.8320309,19.02344 a 15.0015,15.0015 0 0 0 18.242188,-2.30469 c 0,0 7.388934,-7.39089 15.6875,-15.68945 a 15.0015,15.0015 0 0 0 0.0059,-0.006 c 3.212042,-3.21577 7.55886,-5.01563 12.115235,-5.01563 4.541714,0 8.894208,1.80206 12.103514,5.01563 a 15.0015,15.0015 0 0 0 0.008,0.006 l 22.7168,22.71875 a 15.0015,15.0015 0 0 0 0.008,0.006 c 3.21416,3.20989 5.01367,7.56228 5.01368,12.10547 0,4.55637 -1.79986,8.90124 -5.01563,12.11328 a 15.0015,15.0015 0 0 0 -0.004,0.006 c -8.29979,8.29879 -15.6914,15.6914 -15.6914,15.6914 a 15.0015,15.0015 0 0 0 -2.30274,18.24024 c 8.36257,14.14048 14.81644,29.53405 19.02344,45.83203 a 15.0015,15.0015 0 0 0 14.52539,11.25 h 22.14649 c 9.63824,0 17.13476,7.49797 17.13476,17.13476 v 32.13282 c 0,9.63679 -7.49652,17.13281 -17.13476,17.13281 h -22.14649 a 15.0015,15.0015 0 0 0 -14.52539,11.25195 c -4.20697,16.29879 -10.66246,31.69002 -19.02539,45.832033 a 15.0015,15.0015 0 0 0 2.30469,18.242188 l 15.68945,15.689453 a 15.0015,15.0015 0 0 0 0.008,0.0059 c 3.21475,3.21048 5.01368,7.556907 5.01368,12.113281 0,4.543181 -1.79952,8.893622 -5.01368,12.103516 a 15.0015,15.0015 0 0 0 -0.008,0.0078 c -7.30897,7.309973 -15.40774,15.406737 -22.71875,22.718749 a 15.0015,15.0015 0 0 0 -0.006,0.0059 c -3.209986,3.213716 -7.562974,5.015625 -12.103514,5.015625 -4.555202,0 -8.902513,-1.799705 -12.115235,-5.015625 a 15.0015,15.0015 0 0 0 -0.0059,-0.0059 c -8.29814,-8.298139 -15.6875,-15.689453 -15.6875,-15.689453 a 15.0015,15.0015 0 0 0 -18.242188,-2.304687 c -14.141413,8.363499 -29.53459,14.819451 -45.8320309,19.02539 A 15.0015,15.0015 0 0 0 -15,0 v 22.148437 c 0,9.638248 -7.495954,17.132813 -17.134766,17.132813 h -32.132812 c -9.638811,0 -17.132813,-7.494001 -17.132813,-17.132813 V 0 a 15.0015,15.0015 0 0 0 -11.251953,-14.523438 c -16.297436,-4.205939 -31.688666,-10.661891 -45.830076,-19.02539 a 15.0015,15.0015 0 0 0 -18.24414,2.304687 c 0,0 -7.38894,7.390888 -15.6875,15.689453 a 15.0015,15.0015 0 0 0 -0.006,0.0059 c -3.21058,3.214303 -7.55955,5.015625 -12.11328,5.015625 -4.54201,0 -8.89705,-1.800986 -12.10547,-5.013672 a 15.0015,15.0015 0 0 0 -0.006,-0.0078 c -7.31101,-7.312012 -15.4102,-15.40824 -22.7207,-22.718749 a 15.0015,15.0015 0 0 0 -0.006,-0.0059 c -3.21431,-3.210573 -5.01563,-7.563462 -5.01563,-12.105469 0,-4.555201 1.80074,-8.902121 5.01563,-12.113281 a 15.0015,15.0015 0 0 0 0.006,-0.0059 c 8.29856,-8.298566 15.68945,-15.689453 15.68945,-15.689453 a 15.0015,15.0015 0 0 0 2.30664,-18.242188 c -8.3634,-14.141243 -14.81829,-29.532733 -19.02539,-45.832033 a 15.0015,15.0015 0 0 0 -14.52539,-11.25195 h -22.14649 c -9.63824,0 -17.13281,-7.49602 -17.13281,-17.13281 v -32.13282 c 0,-9.63679 7.49457,-17.13476 17.13281,-17.13476 h 22.14649 a 15.0015,15.0015 0 0 0 14.52539,-11.25 c 4.20713,-16.2985 10.6604,-31.69037 19.02344,-45.83008 a 15.0015,15.0015 0 0 0 -2.30274,-18.24414 c 0,0 -7.39203,-7.39108 -15.6914,-15.68945 a 15.0015,15.0015 0 0 0 -0.004,-0.004 c -3.21592,-3.21272 -5.01758,-7.56003 -5.01758,-12.11523 0,-4.54201 1.80132,-8.8949 5.01563,-12.10547 a 15.0015,15.0015 0 0 0 0.006,-0.006 c 7.31152,-7.31053 15.41071,-15.40876 22.7207,-22.71875 a 15.0015,15.0015 0 0 0 0.008,-0.008 c 3.20775,-3.21254 7.56034,-5.01368 12.10352,-5.01368 4.55491,0 8.90143,1.80147 12.11133,5.01563 a 15.0015,15.0015 0 0 0 0.008,0.006 l 15.6875,15.68945 a 15.0015,15.0015 0 0 0 18.24219,2.30469 c 14.14217,-8.36303 29.53564,-14.81869 45.832026,-19.02344 a 15.0015,15.0015 0 0 0 11.251953,-14.52539 v -22.14844 c 0,-9.63881 7.494565,-17.13281 17.132813,-17.13281 z" id="path250" transform="translate(304.2002,442.7187)" /><path d="m 0,-207.80078 c -61.323725,0 -111.40039,50.0777 -111.40039,111.400389 C -111.40039,-35.076854 -61.323537,15 0,15 61.323537,15 111.40039,-35.076854 111.40039,-96.400391 111.40039,-157.72308 61.323725,-207.80078 0,-207.80078 Z m 0,30 c 45.086169,0 81.400391,36.31518 81.400391,81.400389 C 81.400391,-51.314034 45.086357,-15 0,-15 c -45.086357,0 -81.400391,-36.314034 -81.400391,-81.400391 0,-45.085209 36.314222,-81.400389 81.400391,-81.400389 z" id="path245" transform="translate(256,352.3999)" /></g></svg>',
        startChat: '<svg id="OBJECT" width="420" height="420" version="1.1" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg"><path d="m420 210c0-115.79-94.21-210-210-210-115.79 0-210 94.21-210 210a209.9 209.9 0 0 0 43.85 128.43l-41.08 57.89a15 15 0 0 0 12.23 23.68h195c115.79 0 210-94.21 210-210zm-300-75h100a15 15 0 0 1 0 30h-100a15 15 0 0 1 0-30zm180 150h-180a15 15 0 0 1 0-30h180a15 15 0 0 1 0 30zm0-60h-180a15 15 0 0 1 0-30h180a15 15 0 0 1 0 30z"/></svg>',
        mainChat: '<svg width="458.67" height="437.98" fill="none" version="1.1" viewBox="0 0 21.5 20.53" xmlns="http://www.w3.org/2000/svg"><g transform="translate(-1.25,-1.25)" fill="#000"><path d="m17.345 1.3206c-0.8644-0.07062-1.9398-0.07061-3.3115-0.07061h-4.0672c-1.3717 0-2.4472-1e-5 -3.3115 0.07061-0.88015 0.07191-1.6072 0.22077-2.2654 0.5561-1.0819 0.55127-1.9616 1.4309-2.5128 2.5128-0.33533 0.65814-0.48419 1.3852-0.5561 2.2654-0.07062 0.86435-0.07061 1.9398-0.07061 3.3115v4.2619c0 2.4973 2.0244 4.5217 4.5217 4.5217h0.60175c0.2485 0 0.41842 0.251 0.32613 0.4817-0.68666 1.7167 1.2904 3.2686 2.7949 2.194l2.6107-1.8648 0.0492-0.035c0.7089-0.4995 1.5536-0.7703 2.4208-0.7758l0.0603-1e-4h0.6957c1.5486 2e-4 2.4933 4e-4 3.2868-0.2323 1.8792-0.551 3.3488-2.0206 3.8998-3.8998 0.2327-0.7935 0.2325-1.7381 0.2323-3.2867v-1.3648c0-1.3717 0-2.4472-0.0706-3.3115-0.0719-0.88015-0.2208-1.6072-0.5561-2.2654-0.5513-1.0819-1.4309-1.9616-2.5129-2.5128-0.6581-0.33533-1.3852-0.48419-2.2653-0.5561zm-12.275 1.8926c0.41143-0.20963 0.91916-0.33326 1.7065-0.39759 0.79614-0.06505 1.8104-0.06563 3.2229-0.06563h4c1.4125 0 2.4268 5.8e-4 3.2229 0.06563 0.7874 0.06433 1.2951 0.18796 1.7066 0.39759 0.7996 0.40746 1.4498 1.0576 1.8573 1.8573 0.2096 0.41143 0.3332 0.91916 0.3976 1.7065 0.065 0.79614 0.0656 1.8104 0.0656 3.2229v1.1842c0 1.7419-0.0076 2.4521-0.1717 3.0116-0.4073 1.389-1.4935 2.4752-2.8825 2.8825-0.5595 0.1641-1.2697 0.1717-3.0116 0.1717h-0.5488l-0.0699 1e-4c-1.1733 0.0075-2.3162 0.3738-3.2753 1.0496l-2.6676 1.9054c-0.28546 0.2039-0.66058-0.0906-0.53029-0.4163 0.48641-1.216-0.40915-2.5388-1.7188-2.5388h-0.60175c-1.6688 0-3.0217-1.3528-3.0217-3.0217v-4.2283c0-1.4125 5.8e-4 -2.4268 0.06563-3.2229 0.06433-0.78738 0.18796-1.2951 0.39759-1.7065 0.40746-0.79969 1.0576-1.4499 1.8573-1.8573z" clip-rule="evenodd" fill-rule="evenodd"/><path d="m9 10c0 0.5523-0.44772 1-1 1s-1-0.4477-1-1c0-0.55228 0.44772-1 1-1s1 0.44772 1 1z"/><path d="m13 10c0 0.5523-0.4477 1-1 1s-1-0.4477-1-1c0-0.55228 0.4477-1 1-1s1 0.44772 1 1z"/><path d="m17 10c0 0.5523-0.4477 1-1 1s-1-0.4477-1-1c0-0.55228 0.4477-1 1-1s1 0.44772 1 1z"/></g></svg>',
        liveChat: '<svg width="458.67" height="437.98" fill="none" version="1.1" viewBox="0 0 21.5 20.53" xml:space="preserve" xmlns="http://www.w3.org/2000/svg"><g transform="translate(-1.25,-1.25)" fill="#000"><path d="m17.345 1.3206c-0.8644-0.07062-1.9398-0.07061-3.3115-0.07061h-4.0672c-1.3717 0-2.4472-1e-5 -3.3115 0.07061-0.88015 0.07191-1.6072 0.22077-2.2654 0.5561-1.0819 0.55127-1.9616 1.4309-2.5128 2.5128-0.33533 0.65814-0.48419 1.3852-0.5561 2.2654-0.07062 0.86435-0.07061 1.9398-0.07061 3.3115v4.2619c0 2.4973 2.0244 4.5217 4.5217 4.5217h0.60175c0.2485 0 0.41842 0.251 0.32613 0.4817-0.68666 1.7167 1.2904 3.2686 2.7949 2.194l2.6107-1.8648 0.0492-0.035c0.7089-0.4995 1.5536-0.7703 2.4208-0.7758l0.0603-1e-4h0.6957c1.5486 2e-4 2.4933 4e-4 3.2868-0.2323 1.8792-0.551 3.3488-2.0206 3.8998-3.8998 0.2327-0.7935 0.2325-1.7381 0.2323-3.2867v-1.3648c0-1.3717 0-2.4472-0.0706-3.3115-0.0719-0.88015-0.2208-1.6072-0.5561-2.2654-0.5513-1.0819-1.4309-1.9616-2.5129-2.5128-0.6581-0.33533-1.3852-0.48419-2.2653-0.5561zm-12.275 1.8926c0.41143-0.20963 0.91916-0.33326 1.7065-0.39759 0.79614-0.06505 1.8104-0.06563 3.2229-0.06563h4c1.4125 0 2.4268 5.8e-4 3.2229 0.06563 0.7874 0.06433 1.2951 0.18796 1.7066 0.39759 0.7996 0.40746 1.4498 1.0576 1.8573 1.8573 0.2096 0.41143 0.3332 0.91916 0.3976 1.7065 0.065 0.79614 0.0656 1.8104 0.0656 3.2229v1.1842c0 1.7419-0.0076 2.4521-0.1717 3.0116-0.4073 1.389-1.4935 2.4752-2.8825 2.8825-0.5595 0.1641-1.2697 0.1717-3.0116 0.1717h-0.5488l-0.0699 1e-4c-1.1733 0.0075-2.3162 0.3738-3.2753 1.0496l-2.6676 1.9054c-0.28546 0.2039-0.66058-0.0906-0.53029-0.4163 0.48641-1.216-0.40915-2.5388-1.7188-2.5388h-0.60175c-1.6688 0-3.0217-1.3528-3.0217-3.0217v-4.2283c0-1.4125 5.8e-4 -2.4268 0.06563-3.2229 0.06433-0.78738 0.18796-1.2951 0.39759-1.7065 0.40746-0.79969 1.0576-1.4499 1.8573-1.8573z" clip-rule="evenodd" fill-rule="evenodd"/><path d="m15.604 9.1808-5.4088-2.7401a1.3763 1.3763 0 0 0-1.3596 0 1.3931 1.3931 0 0 0-0.60424 1.2588v5.4466a1.4015 1.4015 0 0 0 0.60424 1.2588 1.1707 1.1707 0 0 0 0.62103 0.16785 1.6491 1.6491 0 0 0 0.73852-0.18883l5.4088-2.7317c0.80146-0.41961 0.91896-0.93994 0.91896-1.2253 0-0.28534-0.11749-0.83923-0.91896-1.2463zm-0.38185 1.7036-5.4046 2.7401a0.57907 0.57907 0 0 1-0.5455 0.05036 0.60005 0.60005 0 0 1-0.20142-0.52871v-5.4802a0.60005 0.60005 0 0 1 0.20142-0.52871 0.36506 0.36506 0 0 1 0.16785-0.046156 0.81405 0.81405 0 0 1 0.36087 0.10071l5.4214 2.7401c0.28534 0.14267 0.46158 0.3273 0.46158 0.47416s-0.17624 0.3315-0.46158 0.47836z" stroke-width=".41962"/></g></svg>'
    }

    /**
     * Media/webrtc/callCenter/manager.
     * tool for listing and managing all inbound call enquiries from users. This tool makes call endpoint from the stream that was passed in options to the tool. User (admin, host, stream owner) 
     * can init this tool using any stream. When this tool is inited on a stream, new access row for Users/hosts contact label is created regarding this stream. This means that besides stream owner, 
     * inbound calls may be managed by any users that were assigned Users/hosts label by the stream owner.
     * @module Media
     * @constructor
     * @param {Object} options
     */
    Q.Tool.define("Media/webrtc/callCenter/manager", function (options) {
        var tool = this;

        //window = tool.element.ownerDocument.defaultView;
        //document = window.document;

        tool.alreadyActivated = true;
        tool.callCenterStream = null; //stream to which all calls is related
        tool.callCenterMode = 'regular'; //regular||liveShow
        tool.iAmConnectedToCallCenterRoom = false;
        tool.endpointCallsListEl = null;
        tool.relatedStreamsTool = null;
        tool.relatedStreams = [];
        tool.callsList = [];
        tool.moderators = [];
        tool.myRolesInCallCenter = []; //roles of logged in user relatively publisher of callcenter stream
        tool.currentActiveWebRTCRoom = null;

        if(tool.state.activeWebrtcRoom) {
            tool.currentActiveWebRTCRoom = tool.state.activeWebrtcRoom;
            tool.iAmConnectedToCallCenterRoom = true;
        }

        var url = new URL(location.href);
        var mode = url.searchParams.get("mode");
        tool.loadStyles().then(function() {
            return tool.getCallCenterEndpointStream();
        }).then(function(stream) {
            if(!stream.testReadLevel('relations') || !stream.testWriteLevel('relate') || !stream.testAdminLevel('invite')) {
                return console.error('You are now allowed to create call center on this stream');
            }

            if(!mode) {
                mode = stream.fields.type == 'Media/webrtc' ? 'liveShow' : 'regular';
            } 
            tool.callCenterMode = mode;
            tool.callCenterStream = stream;
            tool.callCenterStream.observe();
            
        }).then(function () {
            return tool.getMyLabelsRelativeToPublisher();
        }).then(function (labels) {
            tool.myRolesInCallCenter = labels.map(function (o) {
                return o.label;
            });
            tool.declareStreamEventHandlers();
            tool.buildInterface();

            Q.handle(tool.state.onLoad, tool);

        });
    },

        {
            publisherId: null,
            streamName: null,
            livestreamStream: null,//only when this tool was activated inside livestreaming editor
            operatorSocketId: null,
            status: { 
                current: null, 
                previous: null,
                setStatus: function (status) {
                    this.previous = this.current;
                    this.current = status;
                }
            }, // interview, windowInterview, regular
            onCallStatusChange: new Q.Event(),
            onRefresh: new Q.Event(),
            onLoad: new Q.Event()
        },

        {
            remove: function () {
                /*var tool = this;
                if(tool.relatedStreamsTool) {
                    tool.relatedStreamsTool.remove()
                }
                if(tool.userChooserTool) {
                    tool.userChooserTool.remove()
                }

                tool.element.innerHTML = '';*/
            },
            refresh: function () {
                var tool = this;
            },
            declareStreamEventHandlers: function() {
                var tool = this;
                tool.callCenterStream.onMessage("Media/webrtc/accepted").set(function (message) {
                    console.log('Media/webrtc/accepted', message)
                    var instructions = JSON.parse(message.instructions);
                    var callDataObject = getCallDataObject(instructions.waitingRoom.streamName);
                    if(!callDataObject) return;
                    callDataObject.statusInfo.status = 'accepted';
                    callDataObject.statusInfo.acceptedByUserId = instructions.byUserId;
                    Q.handle(tool.state.onCallStatusChange, null, [callDataObject]);
                    //tool.updateCallButtons(callDataObject);
                }, tool);
                tool.callCenterStream.onMessage("Media/webrtc/callEnded").set(function (message) {
                    console.log('Media/webrtc/callEnded', message)
                    var instructions = JSON.parse(message.instructions);
                    var callDataObject = getCallDataObject(instructions.waitingRoom.streamName);
                    if(!callDataObject) return;
                    callDataObject.statusInfo.status = 'ended';
                    callDataObject.statusInfo.endedOrDeclinedByUserId = instructions.byUserId;
                    Q.handle(tool.state.onCallStatusChange, null, [callDataObject]);
                    //tool.updateCallButtons(callDataObject);
                }, tool);
                
                tool.callCenterStream.onMessage("Media/webrtc/callDeclined").set(function (message) {
                    console.log('Media/webrtc/callDeclined', message)
                    var instructions = JSON.parse(message.instructions);
                    var callDataObject = getCallDataObject(instructions.waitingRoom.streamName);
                    if(!callDataObject) return;
                    callDataObject.statusInfo.status = 'declined';
                    callDataObject.statusInfo.endedOrDeclinedByUserId = instructions.byUserId;
                    Q.handle(tool.state.onCallStatusChange, null, [callDataObject]);
                    //tool.updateCallButtons(callDataObject);
                }, tool);
                
                tool.callCenterStream.onMessage("Media/webrtc/interview").set(function (message) {
                    console.log('Media/webrtc/interview', message)
                    var instructions = JSON.parse(message.instructions);
                    var callDataObject = getCallDataObject(instructions.waitingRoom.streamName);
                    if(!callDataObject) return;
                    callDataObject.statusInfo.status = 'interview';
                    callDataObject.statusInfo.interviewedByUserId = instructions.byUserId;
                    Q.handle(tool.state.onCallStatusChange, null, [callDataObject]);
                    //tool.updateCallButtons(callDataObject);
                }, tool);
                
                tool.callCenterStream.onMessage("Media/webrtc/approved").set(function (message) {
                    console.log('Media/webrtc/approved', message)
                    var instructions = JSON.parse(message.instructions);
                    var callDataObject = getCallDataObject(instructions.waitingRoom.streamName);
                    if(!callDataObject) return;
                    callDataObject.statusInfo.isApproved = instructions.isApproved;
                    console.log('Media/webrtc/approved isApproved', callDataObject.statusInfo.isApproved)

                    callDataObject.statusInfo.isApprovedByUserId = instructions.byUserId;
                    Q.handle(tool.state.onCallStatusChange, null, [callDataObject]);
                    //tool.updateCallButtons(callDataObject);
                }, tool);
                
                tool.callCenterStream.onMessage("Media/webrtc/hold").set(function (message) {
                    console.log('Media/webrtc/hold', message)
                    var instructions = JSON.parse(message.instructions);
                    var callDataObject = getCallDataObject(instructions.waitingRoom.streamName);
                    if(!callDataObject) return;
                    callDataObject.statusInfo.onHold = instructions.onHold;
                    callDataObject.statusInfo.status = 'created';
                    console.log('Media/webrtc/hold onHold', callDataObject.statusInfo.onHold)

                    callDataObject.statusInfo.putOnHoldByUserId = instructions.byUserId;
                    Q.handle(tool.state.onCallStatusChange, null, [callDataObject]);
                    //tool.updateCallButtons(callDataObject);
                }, tool);

                tool.state.onCallStatusChange.add(function (callDataObject) {
                    if(callDataObject.status == 'declined' || callDataObject.status == 'ended' || callDataObject.status == 'closed') {
                        clearChatContainer(callDataObject);
                    }
                }, 'clearChatContainer');


                function getCallDataObject(streamNameOfCall) {
                    for (let c in tool.callsList) {
                        if(streamNameOfCall == tool.callsList[c].webrtcStream.fields.name) {
                            return tool.callsList[c];
                        }
                    }
                    return null;
                }

                function clearChatContainer(callDataObject) {
                    if(tool.currentActiveChat && tool.currentActiveChat.callDataObject == callDataObject) {
                        if(tool.currentActiveChat.chatTool) {
                            tool.currentActiveChat.chatTool.remove();
                        }
                        if(tool.state.chatContainer) {
                            tool.state.chatContainer.innerHTML = '';
                        }
                    }
                }
            },
            loadStyles: function () {
                return new Promise(function(resolve, reject){
                    Q.addStylesheet('{{Media}}/css/tools/callCenterManager.css?ts=' + performance.now(), function () {
                        resolve();
                    });
                });
            },
            getCallCenterEndpointStream: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/callCenter", ["makeCallCenterFromStream"], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);

                        if (msg) {
                            reject('Error while making call center from a stream');
                        }
                        Q.Streams.get(tool.state.publisherId, tool.state.streamName, function (err, stream) {
                            if (!stream) {
                                console.error('Error while getting call center stream', err);
                                reject('Error while getting call center stream');
                                return;
                            }
    
                            resolve(stream);
                        });
                    }, {
                        method: 'post',
                        fields: {
                            publisherId: tool.state.publisherId,
                            streamName: tool.state.streamName
                        }
                    });
                    
                });
            },
            buildInterface: function () {
                var tool = this;
                var socketConns = Q.Socket.get();
                if (!socketConns) {
                    setTimeout(function () {
                        tool.buildInterface();
                    }, 300)

                    return;
                } else if (socketConns && !socketConns.socket.id) {
                    Q.Socket.onConnect().add(function () {
                        tool.buildInterface();
                    })
                } 

                if (Object.keys(socketConns).length == 0) {
                    console.error('To continue you should be connected to the socket server.');
                    return;
                }  

                tool.state.operatorSocketId = socketConns.socket.id;

                var toolContainer = document.createElement('DIV');
                toolContainer.className = 'media-callcenter-m';

                var toolContainerInner = document.createElement('DIV');
                toolContainerInner.className = 'media-callcenter-m-container-inner';
                toolContainer.appendChild(toolContainerInner);
                
                //var settings = tool.createSettingsDialog();
                //toolContainerInner.appendChild(settings);
                if (tool.state.showControls !== false) {
                    var controlButtonsCon = document.createElement('DIV');
                    controlButtonsCon.className = 'media-callcenter-m-controls-con';
                    toolContainerInner.appendChild(controlButtonsCon);

                    var controlButtons = document.createElement('DIV');
                    controlButtons.className = 'media-callcenter-m-controls';
                    controlButtonsCon.appendChild(controlButtons);

                    let openWebrtcRoomBtn;
                    if (tool.callCenterMode == 'liveShow' && tool.callCenterStream.testWriteLevel('join')) {
                        openWebrtcRoomBtn = document.createElement('BUTTON');
                        openWebrtcRoomBtn.className = 'media-callcenter-m-controls-open-webrtc';
                        openWebrtcRoomBtn.innerHTML = 'Join Teleconference';
                        controlButtons.appendChild(openWebrtcRoomBtn);

                        openWebrtcRoomBtn.addEventListener('click', function () {
                            tool.state.status.setStatus('regular');
                            tool.startOrJoinLiveShowTeleconference();
                        });
                    }

                    let adminLabel = tool.myRolesInCallCenter.indexOf('Users/admins') != -1 || tool.state.publisherId == Q.Users.loggedInUserId();
                    if (adminLabel) {
                        let settingsBtn = document.createElement('BUTTON');
                        settingsBtn.className = 'media-callcenter-m-controls-settings';
                        settingsBtn.innerHTML = _icons.settings;
                        controlButtons.appendChild(settingsBtn);

                        settingsBtn.addEventListener('click', function (e) {
                            var settings = tool.createSettingsDialog();
                            Q.Dialogs.push({
                                title: 'Assign roles in call center',
                                content: settings,
                                onClose: function () {
                                    tool.moderators = [];
                                }
                            });
                        });
                    } else {
                        if (openWebrtcRoomBtn) openWebrtcRoomBtn.style.marginRight = 0;
                    }
                }

                if (tool.state.environment == 'livestreamingEditor') {
                    var chatItemContainer = tool.teleconferenceChatTab = document.createElement('DIV');
                    chatItemContainer.className = 'media-callcenter-m-main-chat';
                    chatItemContainer.dataset.chatType = 'main';
                    toolContainerInner.appendChild(chatItemContainer);
                    
                    var chatItemInnerCon = document.createElement('DIV');
                    chatItemInnerCon.className = 'media-callcenter-m-main-chat-inner';
                    chatItemContainer.appendChild(chatItemInnerCon);

                    var chatItemIcon = document.createElement('DIV');
                    chatItemIcon.className = 'media-callcenter-m-main-chat-icon';
                    chatItemIcon.innerHTML = _icons.mainChat;
                    chatItemInnerCon.appendChild(chatItemIcon);

                    var chatItemTitle = document.createElement('DIV');
                    chatItemTitle.className = 'media-callcenter-m-main-chat-title';
                    chatItemTitle.innerHTML = 'Teleconference chat';
                    chatItemInnerCon.appendChild(chatItemTitle);

                    var msgCounter = document.createElement('DIV');
                    msgCounter.className = 'media-callcenter-m-chat-msgc';
                    chatItemInnerCon.appendChild(msgCounter);

                    Q.Streams.Message.Total.setUpElement(
                        msgCounter,
                        tool.state.publisherId,
                        tool.state.streamName,
                        'Streams/chat/message',
                        tool,
                        { unseenClass: 'media-callcenter-m-chat-unseen' }
                    );

                    chatItemContainer.addEventListener('click', selectChat);

                    var liveChatItemContainer = document.createElement('DIV');
                    liveChatItemContainer.className = 'media-callcenter-m-main-chat';
                    liveChatItemContainer.dataset.chatType = 'live';
                    toolContainerInner.appendChild(liveChatItemContainer);
                    
                    var liveChatItemInnerCon = document.createElement('DIV');
                    liveChatItemInnerCon.className = 'media-callcenter-m-main-chat-inner';
                    liveChatItemContainer.appendChild(liveChatItemInnerCon);

                    var liveChatItemIcon = document.createElement('DIV');
                    liveChatItemIcon.className = 'media-callcenter-m-main-chat-icon';
                    liveChatItemIcon.innerHTML = _icons.liveChat;
                    liveChatItemInnerCon.appendChild(liveChatItemIcon);

                    var liveChatItemTitle = document.createElement('DIV');
                    liveChatItemTitle.className = 'media-callcenter-m-main-chat-title';
                    liveChatItemTitle.innerHTML = 'Livestream chat';
                    liveChatItemInnerCon.appendChild(liveChatItemTitle);

                    var msgCounter = document.createElement('DIV');
                    msgCounter.className = 'media-callcenter-m-chat-msgc';
                    liveChatItemInnerCon.appendChild(msgCounter);
                    
                    Q.Streams.Message.Total.setUpElement(
                        msgCounter, 
                        tool.state.livestreamStream.fields.publisherId, 
                        tool.state.livestreamStream.fields.name, 
                        'Streams/chat/message', 
                        tool, 
                        { unseenClass: 'media-callcenter-m-chat-unseen' }
                    );

                    liveChatItemContainer.addEventListener('click', selectChat);

                    function selectChat(e) {
                        let activeItems = document.querySelectorAll('.media-callcenter-m-calls-item-active');
                        for (let i = 0; i < activeItems.length; i++) {
                            activeItems[i].classList.remove('media-callcenter-m-calls-item-active');
                        }
                        e.currentTarget.classList.add('media-callcenter-m-calls-item-active');

                        let chatType = e.currentTarget.dataset.chatType;
                        
                        if(chatType == 'main') {
                            tool.openConferenceChat(tool.state.publisherId, tool.state.streamName);
                        } else if(chatType == 'live') {
                            tool.openConferenceChat(tool.state.livestreamStream.fields.publisherId, tool.state.livestreamStream.fields.name);
                        }
                    }
                }
                
                var endpointCallsCon = document.createElement('DIV');
                endpointCallsCon.className = 'media-callcenter-m-enpoints-calls-con';
                toolContainerInner.appendChild(endpointCallsCon);

                var endpointCallsInner = tool.endpointCallsListEl = document.createElement('DIV');
                endpointCallsInner.className = 'media-callcenter-m-enpoints-calls';
                if(tool.state.callItemTemplate == 'minimal') {
                    endpointCallsInner.classList.add('calls-minimal-template');
                } else {
                    endpointCallsInner.classList.add('calls-default-template');
                }
                endpointCallsCon.appendChild(endpointCallsInner);

                tool.element.appendChild(toolContainer);

                Q.activate(
                    Q.Tool.setUpElement('div', 'Streams/related', {
                        publisherId: tool.callCenterStream.fields.publisherId,
                        streamName: tool.callCenterStream.fields.name,
                        relationType: 'Media/webrtc/callCenter/call',
                        tag: 'div',
                        isCategory: true,
                        creatable: false,
                        realtime: true,
                        //"relationsOnly": true,
                        "limit": 10,
                        "offset": 0,
                        relatedOptions: {
                            //"relationsOnly": true,
                            "limit": 10,
                            "offset": 0,
                        },
                        onUpdate: function (e) {
                            tool.relatedStreams = e.relatedStreams;
                            tool.reloadCallsList();
                            if(!tool.callsListLoaded) {
                                tool.callsListLoaded = true;
                                tool.onCallsListFirstLoadHandler()
                            }
                        },
                        beforeRenderPreview: function (e) { }
                    }),
                    {},
                    function () {
                        tool.relatedStreamsTool = this;
                    }
                ); 
                
            },
            createSettingsDialog: function () {
                var tool = this;
                var settingsDialog = document.createElement('DIV');
                settingsDialog.className = 'media-callcenter-m-settings-dialog';

                var roles = document.createElement('DIV');
                roles.className = 'media-callcenter-m-settings-roles-chooser';
                settingsDialog.appendChild(roles);

                var userChooserInput = document.createElement('INPUT');
                userChooserInput.className = 'text Media_userChooser_input media-callCenter-m-query';
                userChooserInput.name = 'query';
                userChooserInput.autocomplete = 'off';
                userChooserInput.placeholder = 'Start typing to find user';
                roles.appendChild(userChooserInput)

                var selectedUsers = document.createElement("TABLE");
                selectedUsers.className = 'media-callcenter-m-settings-roles';
                settingsDialog.appendChild(selectedUsers);

                Q.activate(
                    Q.Tool.setUpElement(roles, 'Streams/userChooser', {}),
                    {},
                    function () {
                        tool.userChooserTool = this;
                        this.state.onChoose.set(function (userId, avatar) {
                            addSelectedUser(userId)
                        }, tool);
                    }
                );

                updateRolesList(true);

                function updateRolesList(retnderList) {
                    getCurrentRoles().then(function (contacts) {
                        for(let i in contacts) {
                            let userAlreadyExists = tool.moderators.findIndex(function (el) {
                                return el.contactUserId == contacts[i].contactUserId;
                            })
                            if(userAlreadyExists != -1) continue;
                            contacts[i].roleInCallCenter = contacts[i].label;
                            if(retnderList) {
                                addSelectedUser(contacts[i].contactUserId, contacts[i]);
                            }
                            tool.moderators.push(contacts[i]);
                        }
                    })
                }

                function addSelectedUser(userId, contactInstance) {
                    var contactInstance = contactInstance || null;
                    var labels = [
                        {
                            key: 'hosts',
                            label: 'Users/hosts',
                            displayLabelName: 'Host'
                        },
                        {
                            key: 'screener',
                            label: 'Users/screeners',
                            displayLabelName: 'Screener'
                        }
                    ];
                    var userItem = document.createElement("TR");
                    userItem.className = 'media-callcenter-m-settings-roles-item';
                    var userItemAvatar = document.createElement("TD");
                    userItemAvatar.className = 'media-callcenter-m-settings-roles-avatar';
                    userItem.appendChild(userItemAvatar);
                    
                    var userItemRolesCon = document.createElement("TD");
                    userItemRolesCon.className = 'media-callcenter-m-settings-roles-con';
                    userItem.appendChild(userItemRolesCon);
                    var userItemRole = document.createElement("SELECT");
                    userItemRole.className = 'media-callcenter-m-settings-roles-role';
                    userItemRolesCon.appendChild(userItemRole);
                    var placeholder = document.createElement("OPTION");
                    placeholder.value = '';
                    placeholder.disabled = true;
                    placeholder.selected = contactInstance ? false : true;
                    placeholder.innerHTML = 'Select role';
                    userItemRole.appendChild(placeholder);

                    for(let r in labels) {
                        let role = document.createElement("OPTION");
                        role.value = labels[r].label;
                        role.selected = contactInstance && contactInstance.label == labels[r].label ? true : false;
                        role.innerHTML =  labels[r].displayLabelName;
                        userItemRole.appendChild(role);
                    }

                    var removeUser = document.createElement("TD");
                    var removeUserBtn = document.createElement("DIV");
                    removeUserBtn.className = 'media-callcenter-m-settings-roles-item-remove';
                    removeUser.appendChild(removeUserBtn);
                    userItem.appendChild(removeUser);

                    selectedUsers.appendChild(userItem)

                    Q.activate(
                        Q.Tool.setUpElement(
                            userItemAvatar, // or pass an existing element
                            "Users/avatar",
                            {
                                userId: userId,
                                icon: true,
                                contents: true
                            }
                        )
                    );

                    userItemRole.addEventListener('change', function () {
                        var newLabel = userItemRole.value;
                        if(contactInstance && newLabel != contactInstance.roleInCallCenter) {
                            var promises = [];
                            for (let m in tool.moderators) {
                                if(tool.moderators[m].contactUserId == userId) {
                                    promises.push(removeRole(tool.moderators[m].label, userId));
                                    tool.moderators[m] = null;
                                    tool.moderators = tool.moderators.filter(function (el) {
                                        return el != null;
                                    });
                                    break;
                                }
                            }

                            Promise.all(promises).then(function (contact) {
                                changeRole(newLabel, userId).then(function() {
                                    if(!contactInstance) {
                                        contactInstance = contact;
                                        tool.moderators.push(contactInstance);
                                    }
                                    contactInstance.roleInCallCenter = newLabel
                                    updateRolesList();
                                });
                            })
                        } else {
                            changeRole(newLabel, userId).then(function(contact) {
                                if(!contactInstance) {
                                    contactInstance = contact;
                                    tool.moderators.push(contactInstance);
                                }
                                contactInstance.roleInCallCenter = newLabel
                                updateRolesList();
                            });
                        }                        
                    });

                    removeUser.addEventListener('click', function () {
                        if(contactInstance) {
                            removeRole(contactInstance.label, contactInstance.contactUserId).then(function() {
                                userItem.parentElement.removeChild(userItem);
                            });
                        } else {
                            if(userItem.parentElement != null) {
                                userItem.parentElement.removeChild(userItem);
                            }
                        }
                    });
                }

                function removeRole(label, contactUserId) {
                    return new Promise(function (resolve, reject) {
                        Q.req('Users/contact', '', function (err, data) {
                            var msg = Q.firstErrorMessage(err, data);
                            if (msg) {
                                return reject(msg);
                            }


                            resolve(data);
                        }, {
                            fields: {
                                userId: tool.state.publisherId,
                                label: label,
                                contactUserId: contactUserId
                            },
                            method: 'delete'
                        });
                    });
                }

                function changeRole(newLabel, userId) {
                    return new Promise (function (resolve, reject) {
                        getPublisherUsersLabels().then(function (myLabels) {
                            var existingLabels = Object.keys(myLabels)
    
                            if(existingLabels.indexOf(newLabel) == -1) {    
                                return createUsersLabel(newLabel).then(function (labelInstance) {
                                    return assignLabelToUser(newLabel, userId)
                                }).then(function (contactInstance) {
                                    resolve(contactInstance);
                                });
                            } else {
                                return assignLabelToUser(newLabel, userId).then(function (contactInstance) {
                                    resolve(contactInstance);
                                });
                            }
                        })
                    });
                }

                function getCurrentRoles() {
                    return new Promise(function (resolve, reject) {
                        Q.req('Users/contact', 'contacts', function (err, data) {
                            var msg = Q.firstErrorMessage(err, data);
                            if (msg) {
                                return reject(msg)
                            }

                            Q.each(data.slots.contacts, function (i) {
                                data.slots.contacts[i] = new Q.Users.Contact(data.slots.contacts[i]);
                            });
                            resolve(data.slots.contacts);
                        }, {
                            fields: {
                                userId: tool.state.publisherId,
                                labels: ['Users/hosts', 'Users/screeners']
                            },
                            method: 'get'
                        });
                    });
                }

                function getPublisherUsersLabels() {
                    return new Promise(function (resolve, reject) {
                        Q.req('Users/label', 'labels', function (err, data) {
                            var msg = Q.firstErrorMessage(err, data);
                            if (msg) {
                                return reject(msg)
                            }

                            Q.each(data.slots.labels, function (i) {
                                data.slots.labels[i] = new Q.Users.Label(data.slots.labels[i]);
                            });
                            resolve(data.slots.labels);
                        }, {
                            fields: {
                                userId: tool.state.publisherId,
                                filter: ['Users/', 'Media/']
                            },
                            method: 'GET'
                        });
                    });
                }

                function createUsersLabel(title) {
                    return new Promise(function (resolve, reject) {
                        Q.req('Users/label', 'label', function (err, data) {
                            var msg = Q.firstErrorMessage(err, data);
                            if (msg) {
                                return reject(msg)
                            }

                            var labelObj = new Q.Users.Label(data.slots['label']);

                            resolve(labelObj);
                        }, {
                            fields: {
                                userId: tool.state.publisherId,
                                title: title
                            },
                            method: 'post'
                        });
                    });
                }

                function assignLabelToUser(label, contactUserId) {
                    return new Promise(function (resolve, reject) {
                        Q.req('Users/contact', 'contact', function (err, data) {
                            var msg = Q.firstErrorMessage(err, data);
                            if (msg) {
                                return reject(msg);
                            }

                            var contact = new Q.Users.Contact(data.slots.contact[0]);

                            resolve(contact);
                        }, {
                            fields: {
                                userId: tool.state.publisherId,
                                label: label,
                                contactUserId: contactUserId
                            },
                            method: 'post'
                        });
                    });
                }

                return settingsDialog;
            },
            getMyLabelsRelativeToPublisher: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req('Users/contact', 'contacts', function (err, data) {
                        var msg = Q.firstErrorMessage(err, data);
                        if (msg) {
                            return reject(msg)
                        }

                        Q.each(data.slots.contacts, function (i) {
                            data.slots.contacts[i] = new Q.Users.Label(data.slots.contacts[i]);
                        });
                        resolve(data.slots.contacts);
                    }, {
                        fields: {
                            userId: tool.state.publisherId,
                            contactUserIds: Q.Users.loggedInUserId(),
                            labels: ['Users/hosts', 'Users/admins', 'Users/screeners']
                        },
                        method: 'GET'
                    });
                });
            },
            handleStreamEvents: function (stream, callDataObject) {
                var tool = this;
                stream.onMessage("Streams/changed").set(function (message) {
                    if(callDataObject.title != stream.fields.title) {
                        callDataObject.callTitleEl.innerHTML = callDataObject.title = stream.fields.title;
                    }
                    if(callDataObject.topic != stream.fields.content) {
                        callDataObject.callTopicEl.innerHTML = callDataObject.topic = stream.fields.content;
                    }
                }, tool);
            },
            reloadCallsList: function () {
                var tool = this;
                
                if(Object.keys(tool.relatedStreams).length == 0) {
                    tool.endpointCallsListEl.innerHTML = '';
                    let noCallsNoticeEl = document.createElement('DIV');
                    noCallsNoticeEl.className = 'media-callcenter-m-calls-no-calls';
                    noCallsNoticeEl.innerHTML = 'No calls yet';
                    tool.endpointCallsListEl.appendChild(noCallsNoticeEl);
                } else {
                    let noCallsNoticeEl = document.querySelector('.media-callcenter-m-calls-no-calls');
                    if(noCallsNoticeEl && noCallsNoticeEl.parentElement) {
                        noCallsNoticeEl.parentElement.removeChild(noCallsNoticeEl);
                    }
                }

                var relatedStreams = tool.relatedStreams;
                for (let s in relatedStreams) {
                    let stream = relatedStreams[s];
                    let callExists;
                    for (let c in tool.callsList) {
                        if(stream.fields.name == tool.callsList[c].webrtcStream.fields.name) {
                            callExists = tool.callsList[c];
                            break;
                        }
                    }

                    if(callExists != null) {
                        if(callExists.title != stream.fields.title) {
                            callExists.callTitleEl.innerHTML = callExists.title = stream.fields.title;
                        }
                        if(callExists.topic != stream.fields.content) {
                            callExists.callTopicEl.innerHTML = callExists.topic = stream.fields.content;
                        }
                        continue;
                    }

                    var status = stream.getAttribute('status');

                    var isApproved = stream.getAttribute('isApproved');
                    var onHold = stream.getAttribute('onHold');
                    var isApprovedByUserId = stream.getAttribute('isApprovedByUserId');
                    var putOnHoldByUserId = stream.getAttribute('putOnHoldByUserId');
                    var interviewedByUserId = stream.getAttribute('interviewedByUserId');
                    var acceptedByUserId = stream.getAttribute('acceptedByUserId');
                    var endedOrDeclinedByUserId = stream.getAttribute('endedOrDeclinedByUserId');
                    let callDataObject = {
                        title: stream.fields.title,
                        topic: stream.fields.content,
                        webrtcStream: stream,
                        timestamp: convertDateToTimestamp(stream.fields.insertedTime),
                        statusInfo: {
                            status: status ? status : 'created',
                            isApproved: isApproved == true || isApproved == 'true' ? true : false,
                            onHold: onHold == true || onHold == 'true' ? true : false,
                            isApprovedByUserId: isApprovedByUserId,
                            putOnHoldByUserId: putOnHoldByUserId,
                            interviewedByUserId: interviewedByUserId,
                            acceptedByUserId: acceptedByUserId,
                            endedOrDeclinedByUserId: endedOrDeclinedByUserId
                        }
                    }

                    createCallItemElement(callDataObject);
                    tool.updateCallButtons(callDataObject);

                    tool.callsList.unshift(callDataObject);

                    tool.callsList.sort(function(x, y){
                        return y.timestamp - x.timestamp;
                    })

                    tool.handleStreamEvents(stream, callDataObject);
                }

                for(let c in tool.callsList) {
                    tool.endpointCallsListEl.appendChild(tool.callsList[c].callElement);
                }

                for (let i = tool.callsList.length - 1; i >= 0; i--) {
                    let callIsClosed = true;
                    for (let n in relatedStreams) {
                        if(relatedStreams[n].fields.name == tool.callsList[i].webrtcStream.fields.name) {
                            callIsClosed = false;
                        }
                    }
                    if(callIsClosed) {
                        if(tool.callsList[i].callElement && tool.callsList[i].callElement.parentElement != null) {
                            tool.callsList[i].callElement.parentElement.removeChild(tool.callsList[i].callElement);
                        }
                        let deleted = tool.callsList.splice(i, 1);
                        deleted[0].status = 'closed';
                        Q.handle(tool.state.onCallStatusChange, null, [deleted[0]]);

                    }
                }

                function createCallItemElement(callDataObject) {
                    
                        if(tool.state.callItemTemplate == 'minimal') {
                            createMinimalItemView();
                        } else {
                            createDefaultItemView();
                        }
                    
                    
                    function createDefaultItemView() {
                        if(tool.callCenterMode == 'regular') {
                            var callItemContainer = document.createElement('DIV');
                            callItemContainer.className = 'media-callcenter-m-calls-item';
            
                            var callItemInnerCon = document.createElement('DIV');
                            callItemInnerCon.className = 'media-callcenter-m-calls-item-inner';
                            callItemContainer.appendChild(callItemInnerCon);
            
                            var callItemAvatar = document.createElement('DIV');
                            callItemAvatar.className = 'media-callcenter-m-calls-item-avatar';
                            callItemInnerCon.appendChild(callItemAvatar);
        
                            var callItemInfo = document.createElement('DIV');
                            callItemInfo.className = 'media-callcenter-m-calls-item-info';
                            callItemInnerCon.appendChild(callItemInfo);
            
                            var callTitle = document.createElement('DIV');
                            callTitle.className = 'media-callcenter-m-calls-item-title';
                            callTitle.innerHTML = callDataObject.webrtcStream.fields.title;
                            callItemInfo.appendChild(callTitle);
            
                            var callTopicAndChat = document.createElement('DIV');
                            callTopicAndChat.className = 'media-callcenter-m-calls-item-topic-chat';
                            callItemInfo.appendChild(callTopicAndChat);
                            var callTopic = document.createElement('DIV');
                            callTopic.className = 'media-callcenter-m-calls-item-topic';
                            callTopic.innerHTML = callDataObject.webrtcStream.fields.content;
                            callTopicAndChat.appendChild(callTopic);
                            var callChat = document.createElement('DIV');
                            callChat.className = 'media-callcenter-m-calls-item-chat-btn';
                            callChat.dataset.touchlabel = 'Start chat';
                            callChat.innerHTML = _icons.startChat;
                            callTopicAndChat.appendChild(callChat);
                            
                            let controlButtons = tool.createControlButtons(callDataObject);
                            callItemInfo.appendChild(controlButtons);
        
                            Q.activate(
                                Q.Tool.setUpElement(
                                    callItemAvatar,
                                    "Users/avatar",
                                    {
                                        userId: callDataObject.webrtcStream.fields.publisherId,
                                        contents: false
                                    }
                                )
                            );

                            callDataObject.callElement = callItemContainer;
                            callDataObject.callTitleEl = callTitle;
                            callDataObject.callTopicEl = callTopic;
                        } else {
                            var callItemContainer = document.createElement('DIV');
                            callItemContainer.className = 'media-callcenter-m-calls-item';
            
                            var callItemInnerCon = document.createElement('DIV');
                            callItemInnerCon.className = 'media-callcenter-m-calls-item-inner';
                            callItemContainer.appendChild(callItemInnerCon);
            
                            var callItemAvatar = document.createElement('DIV');
                            callItemAvatar.className = 'media-callcenter-m-calls-item-avatar';
                            callItemInnerCon.appendChild(callItemAvatar);
        
                            var callItemInfo = document.createElement('DIV');
                            callItemInfo.className = 'media-callcenter-m-calls-item-info';
                            callItemInnerCon.appendChild(callItemInfo);
            
                            var callTitle = document.createElement('DIV');
                            callTitle.className = 'media-callcenter-m-calls-item-title';
                            callTitle.innerHTML = callDataObject.webrtcStream.fields.title;
                            callItemInfo.appendChild(callTitle);
            
                            var callDate = document.createElement('DIV');
                            callDate.className = 'media-callcenter-m-calls-item-date';
                            Q.activate(
                                Q.Tool.setUpElement(
                                    callDate,
                                    "Q/timestamp",
                                    {
                                        time: callDataObject.webrtcStream.fields.insertedTime,
                                        capitalized: true,
                                        relative: false
                                    }
                                )
                            );
    
                            callItemInfo.appendChild(callDate);
            
                            var callTopicAndChat = document.createElement('DIV');
                            callTopicAndChat.className = 'media-callcenter-m-calls-item-topic-chat';
                            callItemInfo.appendChild(callTopicAndChat);
                            var callTopic = document.createElement('DIV');
                            callTopic.className = 'media-callcenter-m-calls-item-topic';
                            callTopic.innerHTML = callDataObject.webrtcStream.fields.content;
                            callTopicAndChat.appendChild(callTopic);
                            var callChat = document.createElement('DIV');
                            callChat.className = 'media-callcenter-m-calls-item-chat-btn';
                            callChat.dataset.touchlabel = 'Start chat';
                            callChat.innerHTML = _icons.startChat;
                            callTopicAndChat.appendChild(callChat);
            
                            let controlButtons = tool.createControlButtons(callDataObject);
                            callItemInfo.appendChild(controlButtons);
        
                            Q.activate(
                                Q.Tool.setUpElement(
                                    callItemAvatar,
                                    "Users/avatar",
                                    {
                                        userId: callDataObject.webrtcStream.fields.publisherId,
                                        contents: false
                                    }
                                )
                            );

                            callChat.addEventListener('click', function () {
                                tool.onChatHandler(callDataObject);
                            });

                            callDataObject.callElement = callItemContainer;
                            callDataObject.callTitleEl = callTitle;
                            callDataObject.callTopicEl = callTopic;
                        }
                    }
                    
                    function createMinimalItemView() {
                        var callItemContainer = document.createElement('DIV');
                        callItemContainer.className = 'media-callcenter-m-calls-item';
        
                        var callItemInnerCon = document.createElement('DIV');
                        callItemInnerCon.className = 'media-callcenter-m-calls-item-inner';
                        callItemContainer.appendChild(callItemInnerCon);
        
                        var callItemAvatar = document.createElement('DIV');
                        callItemAvatar.className = 'media-callcenter-m-calls-item-avatar';
                        callItemInnerCon.appendChild(callItemAvatar); 
                        
                        var msgCounter = document.createElement('DIV');
                        msgCounter.className = 'media-callcenter-m-chat-msgc';
                        callItemInnerCon.appendChild(msgCounter);

                        Q.Streams.Message.Total.setUpElement(
                            msgCounter,
                            callDataObject.webrtcStream.fields.publisherId,
                            callDataObject.webrtcStream.fields.name,
                            'Streams/chat/message',
                            tool,
                            { unseenClass: 'media-callcenter-m-chat-unseen' }
                        );
    
                        var callItemInfo = document.createElement('DIV');
                        callItemInfo.className = 'media-callcenter-m-calls-item-info';
                        callItemInnerCon.appendChild(callItemInfo);
        
                        var callDate = document.createElement('DIV');
                        callDate.className = 'media-callcenter-m-calls-item-date';
                        Q.activate(
                            Q.Tool.setUpElement(
                                callDate,
                                "Q/timestamp",
                                {
                                    time: callDataObject.webrtcStream.fields.insertedTime,
                                    capitalized: true,
                                    relative: false,
                                    format: '%l:%M %P'
                                }
                            )
                        );

                        callItemInfo.appendChild(callDate);
                        
    
                        Q.activate(
                            Q.Tool.setUpElement(
                                callItemAvatar,
                                "Users/avatar",
                                {
                                    userId: callDataObject.webrtcStream.fields.publisherId,
                                }
                            )
                        );

                        callItemContainer.addEventListener('click', function () {
                            let activeItems = document.querySelectorAll('.media-callcenter-m-calls-item-active');
                            for (let i = 0; i < activeItems.length; i++) {
                                activeItems[i].classList.remove('media-callcenter-m-calls-item-active');
                            }
                            callItemContainer.classList.add('media-callcenter-m-calls-item-active');
                        });

                        callItemContainer.addEventListener('click', function () {
                            tool.onChatHandler(callDataObject);
                        });

                        callDataObject.callElement = callItemContainer;
                    }
                }
                
                function convertDateToTimestamp(str) {
                    const [dateComponents, timeComponents] = str.split(' ');
                    const [year, month, day] = dateComponents.split('-');
                    const [hours, minutes, seconds] = timeComponents.split(':');

                    const date = new Date(+year, month - 1, +day, +hours, +minutes, +seconds);

                    const timestamp = date.getTime();
                    return timestamp;
                }
            },
            createControlButtons: function (callDataObject) {
                var tool = this;
                var callButtons = document.createElement('DIV');
                callButtons.className = 'media-callcenter-m-calls-item-buttons';

                var markApprovedButton = document.createElement('BUTTON');
                markApprovedButton.className = 'media-callcenter-m-calls-item-buttons-btn media-callcenter-m-calls-item-buttons-approve';
                if(tool.callCenterMode == 'liveShow') callButtons.appendChild(markApprovedButton);
                var markApprovedButtonText = document.createElement('SPAN');
                markApprovedButtonText.innerHTML = 'Mark Approved';
                markApprovedButton.appendChild(markApprovedButtonText);

                var acceptButton = document.createElement('BUTTON');
                acceptButton.className = 'media-callcenter-m-calls-item-buttons-btn media-callcenter-m-calls-item-buttons-accept';
                if(tool.callCenterMode == 'liveShow') callButtons.appendChild(acceptButton);
                var acceptButtonText = document.createElement('SPAN');
                acceptButtonText.innerHTML = 'Accept';
                acceptButton.appendChild(acceptButtonText);

                var interviewButton = document.createElement('BUTTON');
                interviewButton.className = 'media-callcenter-m-calls-item-buttons-btn media-callcenter-m-calls-item-buttons-interview';
                callButtons.appendChild(interviewButton);
                var interviewButtonText = document.createElement('SPAN');
                interviewButtonText.innerHTML = 'Interview';
                interviewButton.appendChild(interviewButtonText);

                var holdButton = document.createElement('BUTTON');
                holdButton.className = 'media-callcenter-m-calls-item-buttons-btn media-callcenter-m-calls-item-buttons-hold';
                callButtons.appendChild(holdButton);
                var holdButtonText = document.createElement('SPAN');
                holdButtonText.innerHTML = 'Hold';
                holdButton.appendChild(holdButtonText);

                var declineButton = document.createElement('BUTTON');
                declineButton.className = 'media-callcenter-m-calls-item-buttons-btn media-callcenter-m-calls-item-buttons-decline';
                callButtons.appendChild(declineButton);
                var declineButtonText = document.createElement('SPAN');
                declineButtonText.innerHTML = 'Drop';
                declineButton.appendChild(declineButtonText);

                markApprovedButton.addEventListener('mouseenter', function () {
                    let textWidth  = markApprovedButtonText.offsetWidth;
                    let parentWidth  = markApprovedButton.offsetWidth;
                    let percent = (parentWidth - textWidth) / textWidth * 100;
                    document.documentElement.style.setProperty('--media-callcenter-m-btn-scroll', percent + '%');
                    if(textWidth > parentWidth) {
                        markApprovedButton.classList.add('media-callcenter-m-calls-item-buttons-btn-scroll');
                    }
                });

                markApprovedButton.addEventListener('mouseleave', function () {
                    markApprovedButton.classList.remove('media-callcenter-m-calls-item-buttons-btn-scroll');
                });

                markApprovedButton.addEventListener('click', function () {
                    tool.onMarkApprovedHandler(callDataObject);
                    updateButtonsState(callDataObject);
                });

                acceptButton.addEventListener('click', function () {
                    tool.onAcceptHandler(callDataObject).then(function () {
                        tool.closeInterviewWindow();
                        updateButtonsState(callDataObject);
                    });
                });
                
                if (tool.state.environment == 'livestreamingEditor') {
                    let menuCon = document.createElement('UL');
                    menuCon.className = 'media-callcenter-m-calls-interview-options';

                    Q.activate(
                        Q.Tool.setUpElement(
                            interviewButton,
                            "Media/webrtc/popupDialog",
                            {
                                content: menuCon,
                                className: 'live-editor-stream-rec-popup'
                            }
                        ),
                        {},
                        function () {
                            let popupDialogTool = this;
                            let openNewRoomItem = document.createElement('LI');
                            openNewRoomItem.innerHTML = 'Open in a new tab';
                            menuCon.appendChild(openNewRoomItem);
                            openNewRoomItem.addEventListener('click', function () {
                                callButtons.classList.add('Q_working');
                                tool.onInterviewHandler(callDataObject, true).then(function () {
                                    updateButtonsState(callDataObject);
                                    callButtons.classList.remove('Q_working');
                                });
                                popupDialogTool.hide();                                
                            });
                            let switchItem = document.createElement('LI');
                            switchItem.innerHTML = 'Switch current room';
                            menuCon.appendChild(switchItem);
        
                            switchItem.addEventListener('click', function () {
                                callButtons.classList.add('Q_working');
                                tool.onInterviewHandler(callDataObject).then(function () {
                                    updateButtonsState(callDataObject);
                                    callButtons.classList.remove('Q_working');
                                });
                                popupDialogTool.hide();  
                            });
                        }
                    );
                } else {
                    interviewButton.addEventListener('click', function () {
                        tool.onInterviewHandler(callDataObject).then(function () {
                            updateButtonsState(callDataObject);
                        });
                    });
                }

                declineButton.addEventListener('click', function () {
                    tool.onDeclineHandler(callDataObject).then(function () {
                        tool.closeInterviewWindow();
                    });
                    updateButtonsState(callDataObject);
                });

                holdButton.addEventListener('click', function () {
                    tool.onHoldHandler(callDataObject).then(function () {
                        tool.closeInterviewWindow();
                    });
                });

                updateButtonsState(callDataObject);
                tool.state.onCallStatusChange.add(updateButtonsState, 'CallCenterObj_' + callDataObject.webrtcStream.fields.name);

                function updateButtonsState(callDataObj) {
                    if(callDataObj != callDataObject) {
                        return;
                    }

                    if(tool.callCenterMode == 'regular') {
                        if(callDataObject.statusInfo.status == 'created') {
                            hideButton(holdButton);
                            showButton(interviewButton);
                            showButton(declineButton); 
                            showButton(markApprovedButton); 
                        } else if(callDataObject.statusInfo.status == 'interview') {
                            showButton(holdButton);
                            showButton(declineButton); 
                            showButton(markApprovedButton); 
                            hideButton(interviewButton);
                        }
    
                        if (markApprovedButton) {
                            if (callDataObject.statusInfo.isApproved) {
                                markApprovedButtonText.innerHTML = 'Approved!';
                                markApprovedButton.classList.add('media-callcenter-m-calls-item-buttons-approved')
                                markApprovedButton.classList.remove('media-callcenter-m-calls-item-buttons-btn-scroll');
                            } else if (!callDataObject.statusInfo.isApproved) {
                                markApprovedButton.classList.remove('media-callcenter-m-calls-item-buttons-approved');
                                markApprovedButtonText.innerHTML = 'Mark Approved';
                            }
                        }
                    } else if(tool.callCenterMode == 'liveShow') {
                        if(callDataObject.statusInfo.status == 'created') {
                            hideButton(holdButton);
                            showButton(markApprovedButton);
                            showButton(acceptButton);
                            showButton(interviewButton);
                            showButton(declineButton);
                        } else if(callDataObject.statusInfo.status == 'interview' && (callDataObject.statusInfo.interviewedByUserId == Q.Users.loggedInUserId() || callDataObject.statusInfo.interviewedByUserId == null)) {
                            let room = tool.currentActiveWebRTCRoom;
                            let weAreAtTheUsersWaitingRoomNow = room && (room.roomStream() && room.roomStream().fields.name == callDataObject.webrtcStream.fields.name || (room.pendingRoomSwitch && room.pendingRoomSwitch.streamName == callDataObject.webrtcStream.fields.name)) ? true : false;
                            
                            if(room && !weAreAtTheUsersWaitingRoomNow && tool.state.status.current != 'windowInterview') {
                                hideButton(holdButton);
                                showButton(interviewButton);
                                showButton(declineButton);
                                showButton(markApprovedButton);
                                showButton(acceptButton);
                            } else {
                                hideButton(interviewButton);
                                showButton(holdButton);
                                showButton(declineButton);
                                showButton(markApprovedButton);
                                showButton(acceptButton);
                            }
                        } else if(callDataObject.statusInfo.status == 'interview' && callDataObject.statusInfo.interviewedByUserId != Q.Users.loggedInUserId()) {
                            hideButton(holdButton);
                            showButton(interviewButton, true);
                            showButton(declineButton);
                            showButton(markApprovedButton);
                            showButton(acceptButton);
                        } else if(callDataObject.statusInfo.status == 'accepted') {
                            showButton(declineButton);
                            showButton(holdButton);
                            hideButton(markApprovedButton);
                            hideButton(acceptButton);
                            hideButton(interviewButton);
                        }
                        
                        if(markApprovedButton) {
                            if(callDataObject.statusInfo.isApproved) {
                                markApprovedButtonText.innerHTML = 'Approved!';
                                markApprovedButton.classList.add('media-callcenter-m-calls-item-buttons-approved')
                                markApprovedButton.classList.remove('media-callcenter-m-calls-item-buttons-btn-scroll');
                            } else if (!callDataObject.statusInfo.isApproved) {
                                markApprovedButton.classList.remove('media-callcenter-m-calls-item-buttons-approved')
                                markApprovedButtonText.innerHTML = 'Mark Approved';
                            }
                        }
                    }
    
                    function showButton(buttonEl, disabled) {
                        if(!buttonEl) return;
                        buttonEl.classList.remove('media-callcenter-m-button-hidden');
                        if(disabled) {
                            buttonEl.disabled = true;
                            //buttonEl.classList.add('media-callcenter-m-disabled');
                        } else {
                            buttonEl.disabled = false;
                            //buttonEl.classList.add('media-callcenter-m-disabled');
                        }
                    }
    
                    function hideButton(buttonEl) {
                        if(!buttonEl) return;
                        if(!buttonEl.classList.contains('media-callcenter-m-button-hidden')) {
                            buttonEl.classList.add('media-callcenter-m-button-hidden');
                        }
                    }
                }

                return callButtons;
            },
            openCallInNewWindow: function (callDataObject) {
                var tool = this;

                return new Promise(function(resolve, reject) {
                    tool.state.status.setStatus('windowInterview');
                    var nameParts = callDataObject.webrtcStream.fields.name.split('/');
                    var roomId = nameParts[nameParts.length - 1];
                    var newWindow = window.open(Q.url('{{baseUrl}}/meeting?room=' + roomId + '&publisherId=' + callDataObject.webrtcStream.fields.publisherId), '_blank');
                    tool.state.currentInterviewWindow = newWindow;
                    var newWindowDocument = newWindow.document;

                    let webrtcStarted = false;
                                    
                    window.addEventListener('message', function (e) {    
                        if (e.origin !== Q.url('{{baseUrl}}')) {
                            reject('Wrong event or origin');
                            return;
                        }
                        if(e.data == 'webrtcstarted') {
                            let webrtcRoom = newWindow.Q.Media.WebRTCRooms[0];        
                            if (!webrtcRoom) {
                                reject('Room was not loaded');
                                return;
                            }
                            tool.currentActiveWebRTCRoom.muteRoom();
                            let waitingNotice = webrtcRoom.notice.show('Waiting on listener...', true)
                            let signallingLib = webrtcRoom.getWebrtcSignalingLib();
                            signallingLib.event.on('participantConnected', function (participant) {
                                if(participant.isLocal) {
                                    return;
                                }
                                waitingNotice.remove();
                            });

                            newWindow.addEventListener('beforeunload', function () {
                                //if call was put on hold
                                if(callDataObject.statusInfo.status == 'interview') {
                                    tool.onHoldHandler(callDataObject);
                                }
                                
                                tool.state.currentInterviewWindow = null;
                                tool.currentActiveWebRTCRoom.unmuteRoom();
                            });
    
                            if(!webrtcStarted) {
                                resolve();
                            }
                        } else if(e.data == 'webrtcstopped') {
                            if (callDataObject.statusInfo.status == 'interview') {
                                tool.onHoldHandler(callDataObject).then(function () {
                                    tool.closeInterviewWindow();
                                });
                            }

                            tool.currentActiveWebRTCRoom.unmuteRoom();
                        }
                    });
                });
            },
            closeInterviewWindow: function () {
                var tool = this;
                if(tool.state.currentInterviewWindow) {
                    tool.state.currentInterviewWindow.close();
                    tool.state.currentInterviewWindow = null;
                }
            },
            onCallsListFirstLoadHandler: function () {
                var tool = this;
                //check whether some calls are already inactive after callCenterManager loaded for the first time
                for(let i in tool.callsList) {
                    let callDataObject = tool.callsList[i];
                    Q.req("Media/callCenter", ["closeIfOffline"], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);

                        if (msg) {
                            return console.error(msg);
                        }

                    }, {
                        method: 'post',
                        fields: {
                            publisherId: callDataObject.webrtcStream.fields.publisherId,
                            streamName: callDataObject.webrtcStream.fields.name,
                            socketId: callDataObject.webrtcStream.getAttribute('socketId'),
                            operatorSocketId: tool.state.operatorSocketId
                        }
                    });
                }
            },
            updateCallButtons: function (callDataObject) {
                var tool = this;                
            },
            startOrJoinLiveShowTeleconference: function () {
                var tool = this;
                if(tool.currentActiveWebRTCRoom && tool.currentActiveWebRTCRoom.isActive()) {
                    tool.switchBackToLiveShowRoom();
                } else {
                    tool.currentActiveWebRTCRoom = Q.Media.WebRTC({
                        roomId: tool.callCenterStream.fields.name.split('/').pop(),
                        roomPublisherId: tool.callCenterStream.fields.publisherId,
                        resumeClosed: true,
                        element: document.body,
                        startWith: { video: false, audio: true }
                    });

                    tool.currentActiveWebRTCRoom.start();
                }
                tool.iAmConnectedToCallCenterRoom = true
            },
            switchBackToLiveShowRoom: function () {
                var tool = this;
                tool.currentActiveWebRTCRoom.switchTo(tool.callCenterStream.fields.publisherId, tool.callCenterStream.fields.name, {resumeClosed: true}).then(function () {
                            
                });
            },
            joinUsersWaitingRooom: function (callDataObject, createNewWindow, onDisconnect) {
                var tool = this;
                if(createNewWindow) {
                    return tool.openCallInNewWindow(callDataObject);
                }

                tool.state.status.setStatus('interview');
                if (tool.currentActiveWebRTCRoom && tool.currentActiveWebRTCRoom.isActive()) {
                    return new Promise(function (resolve, reject) {
                        tool.currentActiveWebRTCRoom.switchTo(callDataObject.webrtcStream.fields.publisherId, callDataObject.webrtcStream.fields.name.split('/').pop(), {}).then(function () {
                            let signalingLibInstance = tool.currentActiveWebRTCRoom.getWebrtcSignalingLib();
                            if (onDisconnect) {
                                signalingLibInstance.event.on('disconnected', function () {
                                    onDisconnect(callDataObject);
                                });
                            }
                            resolve();
                        });
                    });

                } else {
                    return new Promise(function (resolve, reject) {
                        tool.currentActiveWebRTCRoom = Q.Media.WebRTC({
                            roomId: callDataObject.webrtcStream.fields.name,
                            roomPublisherId: callDataObject.webrtcStream.fields.publisherId,
                            element: document.body,
                            startWith: { video: false, audio: true },
                            onWebRTCRoomCreated: function () {
                                let signalingLibInstance = tool.currentActiveWebRTCRoom.getWebrtcSignalingLib();
                                if (onDisconnect) {
                                    signalingLibInstance.event.on('disconnected', function () {
                                        onDisconnect(callDataObject);
                                    });
                                }
                                resolve();
                            }
                        });

                        tool.currentActiveWebRTCRoom.start();
                    });

                }
                
            },
            onMarkApprovedHandler: function (callDataObject) {
                var tool = this;
                //if(tool.callCenterMode != 'liveShow') return;
                var approveStatusToSet = callDataObject.statusInfo.isApproved ? false : true;
                Q.req("Media/callCenter", ["markApprovedHandler"], function (err, response) {
                    var msg = Q.firstErrorMessage(err, response && response.errors);

                    if (msg) {
                        return console.error(msg);
                    }

                    callDataObject.statusInfo.isApproved = approveStatusToSet;
                }, {
                    method: 'post',
                    fields: {
                        isApproved: approveStatusToSet,
                        waitingRoom: {publisherId: callDataObject.webrtcStream.fields.publisherId, streamName: callDataObject.webrtcStream.fields.name},
                        liveShowRoom: {publisherId: tool.state.publisherId, streamName: tool.state.streamName},
                    }
                });
            },
            onHoldHandler: function (callDataObject) {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/callCenter", ["holdHandler"], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);
    
                        if (msg) {
                            reject(msg);
                            return console.error(msg);
                        }
    
                        tool.state.status.setStatus('regular');
    
                        if(tool.state.status.current == 'windowInterview') {
                            callDataObject.statusInfo.status = 'created';
                        } else if (tool.iAmConnectedToCallCenterRoom && tool.currentActiveWebRTCRoom && tool.currentActiveWebRTCRoom.isActive()) {
                            //switchBackToLiveShowRoom can happen only in live show mode
                            callDataObject.statusInfo.status = 'created';
                            tool.switchBackToLiveShowRoom();
                        } else if (tool.currentActiveWebRTCRoom && tool.currentActiveWebRTCRoom.isActive()) {
                            callDataObject.statusInfo.status = 'created';
                            tool.currentActiveWebRTCRoom.stop();
                            tool.currentActiveWebRTCRoom = null;
                        }
                        resolve();
                    }, {
                        method: 'post',
                        fields: {
                            onHold: true,
                            callStatus: callDataObject.statusInfo.status,
                            waitingRoom: { publisherId: callDataObject.webrtcStream.fields.publisherId, streamName: callDataObject.webrtcStream.fields.name },
                            liveShowRoom: { publisherId: tool.state.publisherId, streamName: tool.state.streamName },
                        }
                    });
                });
            },
            onInterviewHandler: function (callDataObject, createNewWindow) {
                var tool = this;
                if(tool.callCenterMode == 'regular') {
                    return new Promise(function (resolve, reject) {
                        Q.req("Media/callCenter", ["interviewHandler"], function (err, response) {
                            var msg = Q.firstErrorMessage(err, response && response.errors);
        
                            if (msg) {
                                reject(msg);
                                return console.error(msg);
                            }
        
                            callDataObject.statusInfo.status = 'interview';
                            tool.joinUsersWaitingRooom(callDataObject, createNewWindow).then(function () {
                                resolve();
                            });
                        }, {
                            method: 'post',
                            fields: {
                                callStatus: callDataObject.statusInfo.status,
                                waitingRoom: {publisherId: callDataObject.webrtcStream.fields.publisherId, streamName: callDataObject.webrtcStream.fields.name},
                                liveShowRoom: {publisherId: tool.state.publisherId, streamName: tool.state.streamName},
                            }
                        });
                    });
                } else if(tool.callCenterMode == 'liveShow') {
                    return new Promise(function (resolve, reject) {
                        Q.req("Media/callCenter", ["interviewHandler"], function (err, response) {
                            var msg = Q.firstErrorMessage(err, response && response.errors);
        
                            if (msg) {
                                reject(msg);
                                return console.error(msg);
                            }
        
                            callDataObject.statusInfo.status = 'interview';
                            tool.joinUsersWaitingRooom(callDataObject, createNewWindow).then(function () {
                                resolve();
                            });
                        }, {
                            method: 'post',
                            fields: {
                                callStatus: callDataObject.statusInfo.status,
                                waitingRoom: {publisherId: callDataObject.webrtcStream.fields.publisherId, streamName: callDataObject.webrtcStream.fields.name},
                                liveShowRoom: {publisherId: tool.state.publisherId, streamName: tool.state.streamName},
                            }
                        });
                    });
                }
                
            },
            onAcceptHandler: function (callDataObject) {
                var tool = this;
                if(tool.callCenterMode != 'liveShow') return;
                return new Promise(function (resolve, reject) {
                    //onAcceptHandler can be fired only in "liveShow", this handler moves user from his waiting room to liveShow webrtc room
                    //so firstly, we need to give him max readLevel access, secondly - post message to his waiting room allowing user to join
                    tool.state.status.setStatus('regular');
                    let prevStatus = callDataObject.statusInfo.status;
                    callDataObject.statusInfo.status = 'accepted';
                    Q.req("Media/callCenter", ["acceptHandler"], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);
    
                        if (msg) {
                            reject(msg);
                            return console.error(msg);
                        }
    
                        if (prevStatus == 'interview' && tool.iAmConnectedToCallCenterRoom) {
                            tool.switchBackToLiveShowRoom();
                        } else if (tool.currentActiveWebRTCRoom && !tool.iAmConnectedToCallCenterRoom) {
                            tool.currentActiveWebRTCRoom.stop();
                            tool.currentActiveWebRTCRoom = null;
                        }
                        resolve(); 
                    }, {
                        method: 'post',
                        fields: {
                            callStatus: prevStatus,
                            waitingRoom: {publisherId: callDataObject.webrtcStream.fields.publisherId, streamName: callDataObject.webrtcStream.fields.name},
                            liveShowRoom: {publisherId: tool.state.publisherId, streamName: tool.state.streamName},
                        }
                    });
                });
            },
            onDeclineHandler: function (callDataObject) {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    tool.state.status.setStatus('regular');
                    var content, action;
                   
                    if(callDataObject.statusInfo.status == 'interview' || callDataObject.statusInfo.status == 'accepted') {
                        action = 'endCall';
                        content = JSON.stringify({
                            immediate: true,
                            userId: callDataObject.webrtcStream.fields.publisherId,
                            msg: 'Call ended'
                        })
                    } else {
                        action = 'declineCall';
                        content = JSON.stringify({
                            immediate: true,
                            userId: callDataObject.webrtcStream.fields.publisherId,
                            msg: 'Your call request was declined'
                        })
                    }
                    var prevStatus = callDataObject.statusInfo.status;
                    callDataObject.statusInfo.status = 'ended';
    
                    Q.req("Media/callCenter", ["endOrDeclineCallHandler"], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);
    
                        if (msg) {
                            reject(msg);
                            return console.error(msg);
                        }
    
                        tool.reloadCallsList();
                        resolve();
                    }, {
                        method: 'post',
                        fields: {
                            callStatus: prevStatus,
                            action: action,
                            waitingRoom: {publisherId: callDataObject.webrtcStream.fields.publisherId, streamName: callDataObject.webrtcStream.fields.name},
                            liveShowRoom: {publisherId: tool.state.publisherId, streamName: tool.state.streamName},
                        }
                    });
                });
            }, 
            onChatHandler: function (callDataObject) {
                var tool = this;

                if(tool.state.columnTool || (typeof tool.state.chatContainer == 'object' && tool.state.chatContainer.name == "q_columns")) {
                    if(tool.chatColumn) {
                        return;
                    }
                    var columnsTool = tool.state.columnTool || tool.state.chatContainer;
                    columnsTool.push({
                        title: "Chat",
                        column: Q.Tool.setUpElement('div', 'Streams/chat', Q.extend({}, {}, {
                            publisherId: callDataObject.webrtcStream.fields.publisherId,
                            streamName: callDataObject.webrtcStream.fields.name
                        })),
                        columnClass: 'Communities_column_chat',
                        onActivate: function (columnElement) {
                            tool.chatColumn = columnElement;
                            Q.Streams.Message.Total.seen(callDataObject.webrtcStream.fields.publisherId, callDataObject.webrtcStream.fields.name, 'Streams/chat', true);
                        }, 
                        onClose: function () {
                            tool.chatColumn = null;
                        }
                    });
                } else if(tool.state.chatContainer instanceof HTMLElement) {
                    if(tool.currentActiveChat && tool.currentActiveChat.chatTool) {
                        tool.currentActiveChat.chatTool.remove()
                    }
                    tool.state.chatContainer.innerHTML = '';
                   
                    var callButtons = tool.createControlButtons(callDataObject);
                    tool.state.chatContainer.appendChild(callButtons);
                    var topic = document.createElement('DIV');
                    topic.className = 'media-callcenter-m-calls-item-title';
                    topic.innerHTML = callDataObject.topic;
                    tool.state.chatContainer.appendChild(topic);

                    let chatContainer = document.createElement('DIV');
                    tool.state.chatContainer.appendChild(chatContainer);
                    Q.activate(
                        Q.Tool.setUpElement(chatContainer, 'Streams/chat', Q.extend({}, {}, {
                            publisherId: callDataObject.webrtcStream.fields.publisherId,
                            streamName: callDataObject.webrtcStream.fields.name
                        })),
                        {},
                        function () {
                            let chatTool = this;
                            tool.currentActiveChat = {
                                callDataObject: callDataObject,
                                chatTool: chatTool
                            }
                        }
                    )
                } else {
                    Q.Dialogs.push({
                        title: 'Chat',
                        className: 'media-callcenter-m-chat-dialog',
                        content: Q.Tool.setUpElement('div', 'Streams/chat', Q.extend({}, {}, {
                            publisherId: callDataObject.webrtcStream.fields.publisherId,
                            streamName: callDataObject.webrtcStream.fields.name
                        })),
                        onActivate: function () {
                            
                        }
                    });
                }
            },
            openConferenceChat: function (publisherId, streamName) {
                var tool = this;
                //if call center is activated in livestream editor, user can open teleconference chat
                if(tool.state.chatContainer instanceof HTMLElement) {
                    if(tool.currentActiveChat && tool.currentActiveChat.chatTool) {
                        tool.currentActiveChat.chatTool.remove()
                    }
                    tool.state.chatContainer.innerHTML = '';

                    let chatContainer = document.createElement('DIV');
                    tool.state.chatContainer.appendChild(chatContainer);
                    Q.activate(
                        Q.Tool.setUpElement(chatContainer, 'Streams/chat', Q.extend({}, {}, {
                            publisherId: publisherId,
                            streamName: streamName
                        })),
                        {},
                        function () {
                            let chatTool = this;
                            tool.currentActiveChat = {
                                callDataObject: null,
                                chatTool: chatTool
                            }
                        }
                    )
                }
            }
                
        }

    );

})(window.jQuery, window);