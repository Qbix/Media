(function ($, window, undefined) {
    var _participantsToolIcons = {
        loudSpeaker: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"    viewBox="0 0 99.5 99.5" enable-background="new 0 0 99.5 99.5" xml:space="preserve">  <path fill="#4AAA4E" d="M49.749,99.5C22.317,99.5,0,77.18,0,49.749C0,22.317,22.317,0,49.749,0S99.5,22.317,99.5,49.749   C99.5,77.18,77.182,99.5,49.749,99.5z"/>  <g>   <g id="Layer_2">    <path fill="#FFFFFF" d="M36.463,39.359l10.089-7.573c0.049-0.028,0.095-0.062,0.146-0.084c0.141-0.059,0.184-0.047,0.333-0.051     c0.055,0.012,0.11,0.024,0.165,0.037c0.05,0.025,0.104,0.044,0.151,0.075c0.046,0.031,0.09,0.068,0.127,0.11     c0.077,0.084,0.131,0.186,0.159,0.295c0.013,0.055,0.013,0.112,0.021,0.168v35.382c-0.019,0.148-0.01,0.191-0.082,0.326     c-0.026,0.049-0.06,0.097-0.098,0.14c-0.076,0.084-0.172,0.146-0.279,0.187c-0.053,0.018-0.109,0.029-0.165,0.034     c-0.056,0.007-0.114,0.005-0.169-0.004c-0.15-0.021-0.18-0.058-0.31-0.131l-10.089-7.571h-8.544     c-0.06-0.009-0.121-0.009-0.179-0.023c-0.058-0.016-0.114-0.039-0.166-0.067c-0.105-0.06-0.192-0.147-0.252-0.251     c-0.03-0.053-0.053-0.109-0.069-0.167c-0.015-0.058-0.016-0.118-0.023-0.179V40.047c0.007-0.06,0.008-0.121,0.023-0.178     c0.016-0.058,0.039-0.114,0.069-0.166c0.03-0.052,0.067-0.1,0.109-0.143c0.086-0.086,0.192-0.147,0.309-0.179     c0.058-0.016,0.119-0.016,0.179-0.023L36.463,39.359L36.463,39.359z"/>   </g>   <g>    <path fill="#FFFFFF" d="M56.589,61.012c-0.25,0-0.502-0.095-0.695-0.283c-0.396-0.386-0.406-1.019-0.021-1.413     c9.074-9.354,0.39-18.188,0.017-18.559c-0.396-0.389-0.396-1.022-0.009-1.415c0.392-0.392,1.024-0.393,1.414-0.005     c0.106,0.105,10.449,10.615,0.016,21.372C57.111,60.91,56.851,61.012,56.589,61.012z"/>   </g>   <g>    <path fill="#FFFFFF" d="M62.776,66.321c-0.251,0-0.502-0.094-0.694-0.282c-0.396-0.385-0.406-1.019-0.021-1.414     c14.264-14.703,0.602-28.596,0.014-29.181c-0.393-0.389-0.395-1.022-0.006-1.414c0.391-0.392,1.023-0.393,1.414-0.005     c0.158,0.157,15.637,15.888,0.014,31.991C63.298,66.218,63.039,66.321,62.776,66.321z"/>   </g>   <g>    <path fill="#FFFFFF" d="M68.638,70.759c-0.251,0-0.502-0.094-0.696-0.28c-0.396-0.386-0.405-1.019-0.021-1.414     c18.602-19.175,0.781-37.297,0.014-38.06c-0.393-0.389-0.395-1.022-0.006-1.414c0.39-0.392,1.023-0.394,1.414-0.005     c0.201,0.2,19.975,20.294,0.014,40.871C69.16,70.66,68.898,70.759,68.638,70.759z"/>   </g>  </g>  </svg>',
        disabledSpeaker: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"   viewBox="0 0 99.5 99.5" enable-background="new 0 0 99.5 99.5" xml:space="preserve">  <path fill="#8C8C8C" d="M49.749,99.5C22.317,99.5,0,77.18,0,49.749C0,22.317,22.317,0,49.749,0S99.5,22.317,99.5,49.749   C99.5,77.18,77.182,99.5,49.749,99.5z"/>  <g>   <path fill="#FFFFFF" d="M47.654,32.336c-0.008-0.056-0.008-0.113-0.021-0.168c-0.028-0.109-0.082-0.211-0.159-0.295    c-0.037-0.042-0.081-0.079-0.127-0.11c-0.047-0.031-0.101-0.05-0.151-0.075c-0.055-0.013-0.11-0.025-0.165-0.037    c-0.149,0.004-0.192-0.008-0.333,0.051c-0.051,0.022-0.097,0.056-0.146,0.084l-10.089,7.573l-8.545-0.001    c-0.06,0.007-0.121,0.007-0.179,0.023c-0.117,0.032-0.223,0.093-0.309,0.179c-0.042,0.043-0.079,0.091-0.109,0.143    c-0.03,0.052-0.053,0.108-0.069,0.166c-0.015,0.057-0.016,0.118-0.023,0.178v19.964c0.007,0.061,0.008,0.121,0.023,0.179    c0.016,0.058,0.039,0.114,0.069,0.167c0.06,0.104,0.147,0.191,0.252,0.251c0.052,0.028,0.108,0.052,0.166,0.067    c0.058,0.015,0.119,0.015,0.179,0.023h7.885l11.851-11.852V32.336z"/>   <path fill="#FFFFFF" d="M46.551,68.27c0.13,0.073,0.16,0.11,0.31,0.131c0.055,0.009,0.113,0.011,0.169,0.004    c0.056-0.005,0.112-0.017,0.165-0.034c0.107-0.041,0.203-0.103,0.279-0.187c0.038-0.043,0.072-0.091,0.098-0.14    c0.072-0.135,0.063-0.178,0.082-0.326V57.356l-6.708,6.708L46.551,68.27z"/>   <path fill="#FFFFFF" d="M55.873,59.316c-0.385,0.395-0.375,1.027,0.021,1.413c0.193,0.188,0.445,0.283,0.695,0.283    c0.262,0,0.521-0.103,0.721-0.304c5.972-6.156,5.136-12.229,3.31-16.319l-1.479,1.48C60.492,49.367,60.773,54.264,55.873,59.316z"    />   <path fill="#FFFFFF" d="M55.88,39.342c-0.361,0.367-0.371,0.937-0.05,1.329l1.386-1.385C56.824,38.964,56.249,38.974,55.88,39.342z    "/>   <path fill="#FFFFFF" d="M62.068,34.03c-0.189,0.191-0.283,0.44-0.286,0.689l0.981-0.982C62.511,33.741,62.26,33.837,62.068,34.03z"    />   <path fill="#FFFFFF" d="M62.06,64.625c-0.385,0.396-0.375,1.029,0.021,1.414c0.192,0.188,0.443,0.282,0.694,0.282    c0.263,0,0.522-0.103,0.72-0.305c10.728-11.057,6.791-21.938,3.22-27.723l-1.401,1.401C68.548,45.015,71.756,54.63,62.06,64.625z"    />   <path fill="#FFFFFF" d="M67.921,69.065c-0.385,0.396-0.375,1.028,0.021,1.414c0.194,0.187,0.445,0.28,0.696,0.28    c0.26,0,0.521-0.1,0.719-0.303c15.146-15.612,7.416-30.945,2.718-37.522l-1.388,1.388C75.15,40.513,82.071,54.48,67.921,69.065z"/>   <path fill="#FFFFFF" d="M80.402,18.845c-0.385,0-0.771,0.147-1.066,0.441L18.422,80.201c-0.589,0.59-0.589,1.543,0,2.133    c0.294,0.293,0.68,0.441,1.066,0.441c0.386,0,0.772-0.148,1.066-0.441l60.913-60.915c0.59-0.588,0.59-1.544,0-2.132    C81.175,18.992,80.789,18.845,80.402,18.845z"/>  </g>  </svg>',
        screen: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"   viewBox="0 0 99.5 99.498" enable-background="new 0 0 99.5 99.498" xml:space="preserve">  <path fill="#4AAA4E" d="M49.749,99.498C22.317,99.498,0,77.181,0,49.749C0,22.318,22.317,0,49.749,0S99.5,22.317,99.5,49.749   C99.5,77.181,77.182,99.498,49.749,99.498z"/>  <g>   <path fill="#FFFFFF" d="M22.158,28.781c-1.204,0-2.172,0.969-2.172,2.173v35.339c0,1.204,0.969,2.173,2.172,2.173h20.857v6.674    h-2.366c-0.438,0-0.79,0.353-0.79,0.789c0,0.438,0.353,0.79,0.79,0.79h18.203c0.438,0,0.789-0.352,0.789-0.79    c0-0.438-0.353-0.789-0.789-0.789h-2.366v-6.674h20.855c1.203,0,2.173-0.969,2.173-2.173V30.954c0-1.204-0.97-2.173-2.173-2.173    H22.158z M22.751,31.47h53.997v34.081H22.751V31.47z"/>   <polygon fill="#F6F4EC" points="42.159,38.611 42.159,59.573 59.137,49.771  "/>  </g>  </svg>',
        disabledScreen: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"   viewBox="0 0 99.499 99.498" enable-background="new 0 0 99.499 99.498" xml:space="preserve">  <path fill="#8C8C8C" d="M49.749,99.498C22.317,99.498,0,77.18,0,49.749S22.317,0,49.749,0s49.75,22.317,49.75,49.749   S77.182,99.498,49.749,99.498z"/>  <g>   <path fill="#FFFFFF" d="M77,31v35H38.234l-1.984,2H43v7h-2.352c-0.438,0-0.79,0.563-0.79,1s0.353,1,0.79,1h18.203    c0.438,0,0.789-0.563,0.789-1s-0.352-1-0.789-1H56v-7h21.341C78.545,68,80,67.497,80,66.293V30.954C80,29.75,78.545,29,77.341,29    h-2.337l-2.02,2H77z"/>   <path fill="#FFFFFF" d="M23,66V31h42.244l2.146-2H22.158C20.954,29,20,29.75,20,30.954v35.339C20,67.497,20.954,68,22.158,68h6.091    l2.11-2H23z"/>   <polygon fill="#FFFFFF" points="42,54.557 51.621,44.936 42,38.611  "/>   <polygon fill="#FFFFFF" points="56.046,47.74 47.016,56.769 59.137,49.771  "/>   <path fill="#FFFFFF" d="M81.061,21.311c0.586-0.585,0.586-1.536,0-2.121C80.768,18.896,80.384,18.75,80,18.75    s-0.768,0.146-1.061,0.439L18.33,79.799c-0.586,0.586-0.586,1.535,0,2.121c0.293,0.293,0.677,0.439,1.061,0.439    s0.768-0.146,1.061-0.439L81.061,21.311z"/>  </g>  </svg>',
        disabledCamera: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"    viewBox="-0.165 -0.245 100 99.999" enable-background="new -0.165 -0.245 100 99.999"    xml:space="preserve">  <path fill="#8C8C8C" d="M49.834-0.245c-27.569,0-50,22.43-50,50c0,27.57,22.429,49.999,50,49.999c27.57,0,50-22.429,50-49.999   C99.835,22.186,77.404-0.245,49.834-0.245z M25.516,37.254h29.489L34.73,60.791h-9.214V37.254z M24.492,75.004l47.98-55.722   l3.046,2.623L27.538,77.627L24.492,75.004z M77.71,61.244l-15.599-9.006v8.553H44.016l18.096-21.006v6.309l15.599-9.006V61.244z"/>  </svg>',
        locDisabledMic: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"    viewBox="-0.165 -0.245 100 99.999" enable-background="new -0.165 -0.245 100 99.999"    xml:space="preserve">  <path fill="#8C8C8C" d="M49.834-0.245c-27.569,0-50,22.43-50,50c0,27.57,22.429,49.999,50,49.999c27.57,0,50-22.429,50-49.999   C99.835,22.186,77.404-0.245,49.834-0.245z M41.411,32.236c0.001-4.678,3.794-8.473,8.473-8.473c4.681,0,8.472,3.793,8.472,8.473   v0.502L41.421,52.4c-0.001-0.068-0.01-0.135-0.01-0.203V32.236z M35.376,42.216h3.379v10.177c0,0.934,0.127,1.836,0.345,2.703   l-2.616,3.037c-0.708-1.713-1.107-3.58-1.107-5.535V42.216z M64.392,52.598c0,7.357-5.51,13.551-12.818,14.408v5.436h6.783v3.381   H41.411v-3.381h6.783v-5.436c-2.8-0.328-5.331-1.443-7.394-3.105l2.317-2.688c1.875,1.441,4.217,2.309,6.767,2.309   c6.146,0,11.127-4.984,11.127-11.129V42.216h3.381V52.598z M44.954,59.078l13.403-15.56v8.677c0,4.68-3.793,8.475-8.473,8.475   C48.042,60.67,46.344,60.076,44.954,59.078z M27.421,77.139l-3.046-2.623l47.979-55.723l3.046,2.623L27.421,77.139z"/>  </svg>',
        accessIcon: '<svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"> <g> <g> <g> <path d="M131.5,472H60.693c-8.538,0-13.689-4.765-15.999-7.606c-3.988-4.906-5.533-11.29-4.236-17.519 c20.769-99.761,108.809-172.616,210.445-174.98c1.693,0.063,3.39,0.105,5.097,0.105c1.722,0,3.434-0.043,5.142-0.107 c24.853,0.567,49.129,5.24,72.236,13.917c10.34,3.885,21.871-1.352,25.754-11.693c3.883-10.34-1.352-21.871-11.693-25.754 c-3.311-1.244-6.645-2.408-9.995-3.512C370.545,220.021,392,180.469,392,136C392,61.01,330.991,0,256,0 c-74.991,0-136,61.01-136,136c0,44.509,21.492,84.092,54.643,108.918c-30.371,9.998-58.871,25.546-83.813,46.062 c-45.732,37.617-77.529,90.086-89.532,147.743c-3.762,18.066,0.744,36.622,12.363,50.908C25.221,503.847,42.364,512,60.693,512 H131.5c11.046,0,20-8.954,20-20C151.5,480.954,142.546,472,131.5,472z M160,136c0-52.935,43.065-96,96-96s96,43.065,96,96 c0,51.367-40.554,93.438-91.326,95.885c-1.557-0.028-3.114-0.052-4.674-0.052c-1.564,0-3.127,0.023-4.689,0.051 C200.546,229.43,160,187.362,160,136z"/> <path d="M496.689,344.607c-8.561-19.15-27.845-31.558-49.176-31.607h-62.372c-0.045,0-0.087,0-0.133,0 c-22.5,0-42.13,13.26-50.029,33.807c-1.051,2.734-2.336,6.178-3.677,10.193H200.356c-5.407,0-10.583,2.189-14.35,6.068 l-34.356,35.388c-7.567,7.794-7.529,20.203,0.085,27.95l35,35.612c3.76,3.826,8.9,5.981,14.264,5.981h65c11.046,0,20-8.954,20-20 c0-11.046-8.954-20-20-20h-56.614l-15.428-15.698L208.814,397h137.491c9.214,0,17.235-6.295,19.426-15.244 c1.618-6.607,3.648-12.959,6.584-20.596c1.936-5.036,6.798-8.16,12.741-8.16c0.013,0,0.026,0,0.039,0h62.371 c5.656,0.013,10.524,3.053,12.705,7.932c5.369,12.012,11.78,30.608,11.828,50.986c0.048,20.529-6.356,39.551-11.739,51.894 c-2.17,4.978-7.079,8.188-12.56,8.188c-0.011,0-0.022,0-0.033,0h-63.125c-5.533-0.013-10.716-3.573-12.896-8.858 c-2.339-5.671-4.366-12.146-6.197-19.797c-2.571-10.742-13.367-17.366-24.105-14.796c-10.743,2.571-17.367,13.364-14.796,24.106 c2.321,9.699,4.978,18.118,8.121,25.738c8.399,20.364,27.939,33.555,49.827,33.606h63.125c0.043,0,0.083,0,0.126,0 c21.351-0.001,40.647-12.63,49.18-32.201c6.912-15.851,15.137-40.511,15.072-67.975 C511.935,384.434,503.638,360.153,496.689,344.607z"/> <circle cx="431" cy="412" r="20"/> </g> </g> </g> </svg>',
        timerIcon: '<svg version="1.1" id="fi_833614" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g> <g> <g> <path d="M391.84,48.87l54.306,45.287c3.739,3.119,8.281,4.641,12.798,4.641c5.729,0,11.415-2.448,15.371-7.191 c7.074-8.483,5.932-21.095-2.552-28.169L417.457,18.15c-8.481-7.074-21.094-5.933-28.169,2.551 C382.214,29.184,383.356,41.795,391.84,48.87z"></path> <path d="M53.057,98.797c4.516,0,9.059-1.522,12.798-4.641L120.16,48.87c8.483-7.074,9.626-19.686,2.552-28.169 c-7.073-8.482-19.686-9.625-28.169-2.551L40.237,63.437c-8.483,7.074-9.626,19.686-2.552,28.169 C41.642,96.349,47.328,98.797,53.057,98.797z"></path> <path d="M422.877,109.123C383.051,69.297,331.494,45.474,276,40.847V20c0-11.046-8.954-20-20-20c-11.046,0-20,8.954-20,20v20.847 c-55.494,4.627-107.051,28.449-146.877,68.275C44.548,153.697,20,212.962,20,276s24.548,122.303,69.123,166.877 C133.697,487.452,192.962,512,256,512c50.754,0,99.118-15.869,139.864-45.894c8.893-6.552,10.789-19.072,4.237-27.965 c-6.553-8.894-19.074-10.789-27.966-4.237C338.313,458.827,298.154,472,256,472c-108.075,0-196-87.925-196-196S147.925,80,256,80 s196,87.925,196,196c0,33.01-8.354,65.638-24.161,94.356c-5.326,9.677-1.799,21.839,7.878,27.165 c9.674,5.324,21.838,1.8,27.165-7.878C481.931,355.032,492,315.735,492,276C492,212.962,467.452,153.697,422.877,109.123z"></path> <path d="M353.434,155.601c-8.584-6.947-21.178-5.622-28.128,2.965l-63.061,77.925C260.209,236.17,258.124,236,256,236 c-22.056,0-40,17.944-40,40c0,22.056,17.944,40,40,40c22.056,0,40-17.944,40-40c0-5.052-0.951-9.884-2.668-14.338l63.067-77.933 C363.348,175.142,362.021,162.548,353.434,155.601z"></path> </g> </g></g></svg>',
        settings: '<svg version="1.1" id="fi_992668" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"> <g> <g> <path d="M490.667,405.333h-56.811C424.619,374.592,396.373,352,362.667,352s-61.931,22.592-71.189,53.333H21.333 C9.557,405.333,0,414.891,0,426.667S9.557,448,21.333,448h270.144c9.237,30.741,37.483,53.333,71.189,53.333 s61.931-22.592,71.189-53.333h56.811c11.797,0,21.333-9.557,21.333-21.333S502.464,405.333,490.667,405.333z M362.667,458.667 c-17.643,0-32-14.357-32-32s14.357-32,32-32s32,14.357,32,32S380.309,458.667,362.667,458.667z"></path> </g> </g> <g> <g> <path d="M490.667,64h-56.811c-9.259-30.741-37.483-53.333-71.189-53.333S300.736,33.259,291.477,64H21.333 C9.557,64,0,73.557,0,85.333s9.557,21.333,21.333,21.333h270.144C300.736,137.408,328.96,160,362.667,160 s61.931-22.592,71.189-53.333h56.811c11.797,0,21.333-9.557,21.333-21.333S502.464,64,490.667,64z M362.667,117.333 c-17.643,0-32-14.357-32-32c0-17.643,14.357-32,32-32s32,14.357,32,32C394.667,102.976,380.309,117.333,362.667,117.333z"></path> </g> </g> <g> <g> <path d="M490.667,234.667H220.523c-9.259-30.741-37.483-53.333-71.189-53.333s-61.931,22.592-71.189,53.333H21.333 C9.557,234.667,0,244.224,0,256c0,11.776,9.557,21.333,21.333,21.333h56.811c9.259,30.741,37.483,53.333,71.189,53.333 s61.931-22.592,71.189-53.333h270.144c11.797,0,21.333-9.557,21.333-21.333C512,244.224,502.464,234.667,490.667,234.667z M149.333,288c-17.643,0-32-14.357-32-32s14.357-32,32-32c17.643,0,32,14.357,32,32S166.976,288,149.333,288z"></path> </g> </g> </svg>',
    }
    var _controlsToolIcons = []; 

    var ua = navigator.userAgent;
    var _isiOS = false;
    var _isAndroid = false;
    var _isiOSCordova = false;
    var _isAndroidCordova = false;
    if (ua.indexOf('iPad') != -1 || ua.indexOf('iPhone') != -1 || ua.indexOf('iPod') != -1) _isiOS = true;
    if (ua.indexOf('Android') != -1) _isAndroid = true;
    if (typeof cordova != 'undefined' && _isiOS) _isiOSCordova = true;
    if (typeof cordova != 'undefined' && _isAndroid) _isAndroidCordova = true;

    function log(){}
    if(Q.Media.WebRTCdebugger) {
        log = Q.Media.WebRTCdebugger.createLogMethod('participants.js')
    }

    /**
     * Media/webrtc/control tool.
     * Users can chat with each other via WebRTC using Twilio or raw streams
     * @module Media
     * @class Media webrtc
     * @constructor
     * @param {Object} options
     *  Hash of possible options
     */
    Q.Tool.define("Media/webrtc/participants", function (options) {
        var tool = this;
        _controlsToolIcons = tool.state.controlsTool.getIcons();

        tool.participantListEl = null;
        tool.participantsList = [];
        tool.permissionsManagerTool = null;
        tool.limitsManagerTool = null;

        tool.webrtcUserInterface = options.webrtcUserInterface();
        tool.webrtcSignalingLib = tool.webrtcUserInterface.getWebrtcSignalingLib();
        tool.roomStream = tool.webrtcUserInterface.roomStream();
        
        tool.toolContainer = document.createElement('DIV');
        tool.toolContainer.className = 'Media_webrtc_tool-container';

        tool.loadStyles().then(function ()  {
            tool.createList();
            tool.declareEventsHandlers();
        })
    },

        {
            onRefresh: new Q.Event(),
            controlsTool: null,
            webrtcUserInterface: null
        },

        {
            loadStyles: function () {
                return new Promise(function (resolve, reject) {
                    Q.addStylesheet('{{Media}}/css/tools/webrtcParticipants.css?ts=' + Date.now(), function () {
                        resolve();
                    });
                });
            },
            refresh: function () {
                var tool = this;
                tool.refreshList();
            },
            declareEventsHandlers: function() {
                var tool = this;
                var webrtcSignalingLib = tool.webrtcSignalingLib;

                webrtcSignalingLib.event.on('beforeSwitchRoom', function (e) {
                    tool.webrtcSignalingLib = e.newWebrtcSignalingLibInstance;
                    tool.roomStream = tool.webrtcUserInterface.roomStream();
                    tool.declareEventsHandlers();
                });

                tool.roomStream.onMessage("Media/webrtc/addOrRemoveCohost").set(function (message) {
                    var insturctions = JSON.parse(message.instructions);
                    if(!insturctions.ofUserId) {
                        return;
                    }
                    
                    var roomParticipants = tool.webrtcSignalingLib.roomParticipants();
                    for(let i in roomParticipants) {
                        tool.updateItem(roomParticipants[i]);
                    }

                    tool.updateUIAccordingAccess();
                });

                tool.roomStream.onMessage("Media/webrtc/turnLimitsOnOrOff").set(function (message) {
                    var insturctions = JSON.parse(message.instructions);
                    if (!insturctions.action == 'on') {
                        
                    } else {

                    }
                }, tool);

                webrtcSignalingLib.event.on('participantConnected', function (participant) {
                    log('controls: participantConnected');

                    setRealName(participant, function (name) {
                        tool.addItem(participant);
                    });
                });
                webrtcSignalingLib.event.on('participantDisconnected', function (participant) {
                    tool.removeItem(participant);
                });
                webrtcSignalingLib.event.on('participantRemoved', function (participant) {
                    tool.removeItem(participant);
                });
                webrtcSignalingLib.event.on('screenAdded', function (e) {
                    tool.updateItem(e.participant);
                });
                webrtcSignalingLib.event.on('screenRemoved', function (e) {
                    tool.updateItem(e.participant);
                });
                webrtcSignalingLib.event.on('micEnabled', function () {;
                    tool.updateItem(webrtcSignalingLib.localParticipant());
                });
                webrtcSignalingLib.event.on('micDisabled', function () {
                    tool.updateItem(webrtcSignalingLib.localParticipant());
                });
                webrtcSignalingLib.event.on('audioMuted', function (participant) {;
                    tool.updateItem(participant);
                });
                webrtcSignalingLib.event.on('audioUnmuted', function (participant) {
                    tool.updateItem(participant);
                });
                webrtcSignalingLib.event.on('liveStreamingStarted', function (e) {
                    tool.showLiveIndicator(e.participant, e.platform.content);
                });
                webrtcSignalingLib.event.on('liveStreamingEnded', function (e) {
                    tool.hideLiveIndicator(e.participant, e.platform);
                });
                webrtcSignalingLib.event.on('someonesCameraEnabled', function (e) {
                    tool.hideMediaRequestIndicator(e, 'camera');
                });
                webrtcSignalingLib.event.on('someonesMicEnabled', function (e) {
                    tool.hideMediaRequestIndicator(e, 'mic');
                });

                function setRealName(participant, callback) {
                    var userId = participant.identity != null ? participant.identity.split('\t')[0] : null;
                    if (userId != null) {

                        var firstName;
                        var lastName;
                        var fullName = '';
                        Q.Streams.get(userId, 'Streams/user/firstName', function (err, stream) {

                            if (!stream || stream.fields == null) {
                                if (callback != null) callback({ firstName: 'n/a', lastName: 'n/a' });
                                return;
                            }

                            firstName = stream.fields.content;
                            if (firstName != null) {
                                fullName += firstName;
                            }

                            try {
                                Q.Streams.get(userId, 'Streams/user/lastName', function (err, stream) {

                                    if (!stream || !stream.fields) {
                                        if (callback != null) callback({ firstName: firstName, lastName: '' });
                                        return;
                                    }

                                    lastName = stream.fields.content;

                                    if (lastName != null) {
                                        fullName += ' ' + lastName;
                                    }

                                    participant.username = fullName;

                                    if (callback != null) callback({ firstName: firstName, lastName: lastName });
                                });

                            } catch (e) {
                                participant.username = fullName;
                                if (callback != null) callback({ firstName: firstName, lastName: lastName });
                            }

                        });
                    }
                }
            },
            /**
             * Create participants popup that appears while pointer hovers users button on desktop/in modal box on mobile
             * @method participantsPopup
             */
            createList: function () {
                var tool = this;

                var localParticipant = tool.webrtcSignalingLib.localParticipant();
                var roomParticipants = tool.webrtcSignalingLib.roomParticipants();
                
                var waitingRoomsListCon = document.createElement('DIV');
                waitingRoomsListCon.className = 'Media_webrtc_waiting-participants-list';
                tool.toolContainer.appendChild(waitingRoomsListCon);
                tool.waitingRoomsList = waitingRoomsListCon;

                tool.participantListEl = document.createElement('UL');
                tool.participantListEl.className = 'Media_webrtc_participants-list';
                tool.toolContainer.appendChild(tool.participantListEl);
                tool.addItem(localParticipant);
                roomParticipants = tool.webrtcSignalingLib.roomParticipants();
                for (var i in roomParticipants) {
                    if (roomParticipants[i].isLocal) continue;
                    tool.addItem(roomParticipants[i]);
                }

                
                var buttonsCon = document.createElement('DIV');
                buttonsCon.className = 'Media_webrtc_participants-btns-con';
                tool.toolContainer.appendChild(buttonsCon);

                var inviteBtn = document.createElement('DIV');
                inviteBtn.className = 'Media_webrtc_participants-btn Media_webrtc_participants-invite-btn';
                buttonsCon.appendChild(inviteBtn);
                var inviteBtnIcon = document.createElement('DIV');
                inviteBtnIcon.className = 'Media_webrtc_participants-btn-icon';
                inviteBtnIcon.innerHTML = _controlsToolIcons.plusIcon;
                inviteBtn.appendChild(inviteBtnIcon);
                var inviteBtnText = document.createElement('DIV');
                inviteBtnText.className = 'Media_webrtc_participants-btn-text';
                inviteBtnText.innerHTML = 'Invite';
                inviteBtn.appendChild(inviteBtnText);

                var manageBtn = document.createElement('DIV');
                manageBtn.className = 'Media_webrtc_participants-btn Media_webrtc_participants-manage-btn';
                buttonsCon.appendChild(manageBtn);
                var manageBtnIcon = document.createElement('DIV');
                manageBtnIcon.className = 'Media_webrtc_participants-btn-icon';
                manageBtnIcon.innerHTML = _participantsToolIcons.settings;
                manageBtn.appendChild(manageBtnIcon);
                var manageBtnText = document.createElement('DIV');
                manageBtnText.className = 'Media_webrtc_participants-btn-text';
                manageBtnText.innerHTML = 'Manage';
                manageBtn.appendChild(manageBtnText);

                tool.manageButton = manageBtn;

                manageBtn.addEventListener('click', function () {
                    if(tool.settingsTool) {
                        showSetingsTool();
                    } else {
                        activateSettingsTool().then(function () {
                            showSetingsTool();
                        });
                    }
                })

                inviteBtn.addEventListener('click', function () {
                    Q.Streams.invite(tool.roomStream.fields.publisherId, tool.roomStream.fields.name, {
                        appUrl: Q.url("meeting"),
                        title: 'Invite to Teleconference',
                        addLabel: [],
                        addMyLabel: []
                    });
                });

                tool.updateUIAccordingAccess();

                function showSetingsTool() {
                    Q.Dialogs.push({
                        title: 'Teleconference settings',
                        className: 'Media_manage_webrtc_permissions',
                        content: tool.settingsTool.settingsUI,
                        apply: true,
                        onActivate: function (dialog) {

                        }
                    });
                }

                function activateSettingsTool() {
                    return new Promise(function (resolve, reject) {
                        Q.activate(
                            Q.Tool.setUpElement('DIV', 'Media/webrtc/settings', {
                                publisherId: tool.roomStream.fields.publisherId,
                                streamName: tool.roomStream.fields.name,
                                onLoad: function () {
                                    tool.settingsTool.settingsUI.style.minWidth = '500px';
                                    resolve();
                                }
                            }),
                            {},
                            function () {
                                tool.settingsTool = this;
                            }
                        );
                    });
                }
            },
            createSettingsDialog: function () {
                

            },
            updateUIAccordingAccess: function () {
                var tool = this;
                var localParticipant = tool.webrtcSignalingLib.localParticipant();
                if(localParticipant.access.isCohost || localParticipant.access.isAdmin) {
                    if(!tool.waitingRoomsListTool) {
                        var waitingRoomsListToolCon = document.createElement('DIV');
                        waitingRoomsListToolCon.className = 'Media_webrtc_waiting-participants-list-tool';
                        tool.waitingRoomsList.appendChild(waitingRoomsListToolCon);
                            
                        Q.activate(
                            Q.Tool.setUpElement(waitingRoomsListToolCon, 'Media/webrtc/waitingRoomList', {
                                webrtcUserInterface: tool.state.webrtcUserInterface,
                            }),
                            {},
                            function () {
                                tool.waitingRoomsListTool = this;
                                
                            }
                        );
                    }

                    if(tool.manageButton) {
                        tool.manageButton.style.display = '';
                    }
                } else {
                    if(tool.waitingRoomsListTool) {
                        Q.Tool.remove(tool.waitingRoomsListTool.element, true, true);
                        tool.waitingRoomsListTool = null;
                        tool.waitingRoomsList.innerHTML = '';
                    }

                    if(tool.manageButton) {
                        tool.manageButton.style.display = 'none';
                    }
                }  
            },
            refreshList: function () {
                var tool = this;
                if (tool.participantListEl) tool.participantListEl.innerHTML = '';
                tool.participantsList = [];

                tool.addItem(tool.webrtcSignalingLib.localParticipant());
                roomParticipants = tool.webrtcSignalingLib.roomParticipants();
                
                for (var i in roomParticipants) {
                    if (roomParticipants[i].isLocal) continue;
                    tool.addItem(roomParticipants[i]);
                }
            },
            /**
            * Add item to participants list and bind events that are happened on buttons click/tap
            * @method addItem
            */
            addItem: function (roomParticipant) {
                var tool = this;
                var localParticipant = tool.webrtcSignalingLib.localParticipant();
                function ListItem() {
                    this.listElement = null;
                    this.audioBtnEl = null;
                    this.cameraBtnEl = null;
                    this.videoBtnsEl = null;
                    this.liveStatusEl = null;
                    this.participant = null;
                    this.isVideoMuted = null;
                    this.screenSharingIsMuted = null;
                    this.manuallyToggled = false;
                    this.isActive = true;
                    this.toggleLocalAudio = function () {
                        var i, listItem;
                        for (i = 0; listItem = tool.participantsList[i]; i++) {
                            if (listItem.participant.isLocal) {
                                var enabledAudioTracks = localParticipant.tracks.filter(function (t) {
                                    return t.kind == 'audio' && t.mediaStreamTrack != null && t.mediaStreamTrack.enabled;
                                }).length;

                                if (tool.webrtcSignalingLib.localMediaControls.micIsEnabled() && (enabledAudioTracks != 0 || localParticipant.audioStream != null)) {
                                    listItem.audioBtnEl.innerHTML = _participantsToolIcons.locDisabledMic;
                                    tool.webrtcSignalingLib.localMediaControls.disableAudio();
                                } else {
                                    listItem.audioBtnEl.innerHTML = _controlsToolIcons.microphoneTransparent;
                                    tool.webrtcSignalingLib.localMediaControls.enableAudio();
                                }
                                tool.state.controlsTool.updateControlBar();

                                break;
                            }
                        }
                    };
                    this.muteVideo = function () {
                        this.cameraBtnEl.innerHTML = _participantsToolIcons.disabledCamera;
                        this.cameraBtnEl.dataset.touchlabel = Q.getObject("webrtc.participantsPopup.turnOnCamera", tool.text);
                        this.isVideoMuted = true;
                        this.isActive = false;
                    };
                    this.unmuteVideo = function () {
                        this.cameraBtnEl.innerHTML = _controlsToolIcons.cameraTransparent;
                        this.cameraBtnEl.dataset.touchlabel = Q.getObject("webrtc.participantsPopup.turnOffCamera", tool.text);
                        this.isVideoMuted = false;
                        this.isActive = true;
                    };
                    this.muteScreenSharingVideo = function () {
                        this.screenSharingBtnEl.innerHTML = _participantsToolIcons.disabledScreen;
                        this.screenSharingBtnEl.dataset.touchlabel = Q.getObject("webrtc.participantsPopup.turnOnScreenSharing", tool.text);
                        this.screenSharingIsMuted = true;
                    };
                    this.unmuteScreenSharingVideo = function () {
                        this.screenSharingBtnEl.innerHTML = _participantsToolIcons.screen;
                        this.screenSharingBtnEl.dataset.touchlabel = Q.getObject("webrtc.participantsPopup.turnOffScreenSharing", tool.text);
                        this.screenSharingIsMuted = false;
                    };
                    this.toggleAudio = function (manually) {
                        if (this.participant.isLocal) {
                            this.toggleLocalAudio();
                            return;
                        }
                        if (!this.participant.audioIsMuted) {
                            this.muteAudio();
                        } else {
                            this.unmuteAudio();
                        }
                    };
                    this.muteAudio = function () {
                        this.participant.muteAudio();

                    };
                    this.unmuteAudio = function () {
                        this.participant.unmuteAudio();
                    };
                    this.toggleAudioIcon = function (audioIsActive) {
                        if (audioIsActive === true) {
                            this.audioBtnEl.innerHTML = _participantsToolIcons.loudSpeaker;
                            this.audioBtnEl.dataset.touchlabel = Q.getObject("webrtc.participantsPopup.turnOffAudio", tool.text);
                        } else if (audioIsActive === false) {
                            this.audioBtnEl.innerHTML = _participantsToolIcons.disabledSpeaker;
                            this.audioBtnEl.dataset.touchlabel = Q.getObject("webrtc.participantsPopup.turnOnAudio", tool.text);
                        }
                    };
                    this.remove = function () {
                        if (this.listElement.parentNode != null) this.listElement.parentNode.removeChild(this.listElement);
                        for (var i in tool.participantsList) {
                            if (tool.participantsList[i].participant.sid == this.participant.sid) {
                                tool.participantsList[i] = null;
                                break;
                            }
                        }

                        tool.participantsList = tool.participantsList.filter(function (listItem) {
                            return listItem != null;
                        })

                    };
                    this.toggleScreen = function (manually) {
                        var participant = this.participant;
                        var screens = participant.screens;

                        this.manuallyToggled = manually;
                        if (this.isActive == false) {
                            for (let s in screens) {
                                if (screens[s].screensharing || (screens[s].trackEl && !screens[s].trackEl.srcObject.active)) continue;
                                this.showPartcicipantScreens(screens[s], manually);
                            }

                            this.unmuteVideo();

                        } else {
                            for (let s in screens) {
                                if (screens[s].screensharing || (screens[s].trackEl && !screens[s].trackEl.srcObject.active)) continue;
                                this.removePartcicipantScreens(screens[s]);
                            }
                            this.muteVideo();
                        }

                        tool.webrtcUserInterface.screenRendering.updateLayout();

                    };
                    this.toggleScreenSharingScreen = function () {
                        var participant = this.participant;
                        var screens = participant.screens;

                        if (this.screenSharingIsMuted) {
                            for (let s in screens) {
                                let videoTracks = screens[s].videoTracks();
                                if (!screens[s].screensharing || (videoTracks[0].trackEl && !videoTracks[0].trackEl.srcObject.active)) continue;
                                this.showPartcicipantScreens(screens[s]);
                            }

                            this.unmuteScreenSharingVideo();

                        } else {
                            for (let s in screens) {
                                let videoTracks = screens[s].videoTracks();
                                if (!screens[s].screensharing || (videoTracks[0].trackEl && !videoTracks[0].trackEl.srcObject.active)) continue;
                                this.removePartcicipantScreens(screens[s]);
                            }
                            this.muteScreenSharingVideo();
                        }

                        tool.webrtcUserInterface.screenRendering.updateLayout();

                    };
                    this.removePartcicipantScreens = function (screen) {
                        var screens;
                        if (screen != null) {
                            screens = [screen]
                        } else {
                            screens = this.participant.screens;
                        }

                        for (var s in screens) {
                            let screen = screens[s];
                            screen.hide();
                        }
                    };
                    this.showPartcicipantScreens = function (screen, manually) {
                        var screens;
                        if (screen != null) {
                            screens = [screen]
                        } else {
                            screens = this.participant.screens;
                        }

                        for (var s in screens) {
                            let screen = screens[s];
                            screen.show();
                        }
                    };
                    this.showLiveIcon = function (platform) {
                        if (platform == 'facebook') {
                            let iconCon = document.createElement('DIV');
                            iconCon.className = 'Media_webrtc_fblive_icon';
                            iconCon.innerHTML = _controlsToolIcons.facebookLive;
                            this.liveStatusEl.appendChild(iconCon)
                        } else {
                            let iconCon = document.createElement('DIV');
                            iconCon.className = 'Media_webrtc_live_icon';
                            iconCon.innerHTML = _controlsToolIcons.liveStreaming;
                            this.liveStatusEl.appendChild(iconCon)
                        }

                        if (!this.liveStatusEl.classList.contains('isRecording')) this.liveStatusEl.classList.add('isRecording');
                    };
                    this.hideLiveIcon = function (platform) {
                        this.liveStatusEl.innerHTML = '';
                        if (this.liveStatusEl.classList.contains('isRecording')) this.liveStatusEl.classList.remove('isRecording');
                    };
                    this.showMediaRequestIcon = function (type, waitingTime) {
                        var participantListItem = this;
                        log('controls: showMediaRequestIcon');
                        if (type == 'camera') {
                            let cameraRequestCon = document.createElement('DIV');
                            cameraRequestCon.className = 'Media_webrtc_camera_request_con';
                            let iconCon = document.createElement('DIV');
                            iconCon.className = 'Media_webrtc_camera_request_icon';
                            iconCon.innerHTML = _controlsToolIcons.cameraRequest;
                            let requestTimer = document.createElement('DIV');
                            requestTimer.className = 'Media_webrtc_camera_request_timer';
                            cameraRequestCon.appendChild(iconCon)
                            cameraRequestCon.appendChild(requestTimer)
                            this.mediaRequestStatusEl.appendChild(cameraRequestCon)

                            if (!this.mediaRequestStatusEl.classList.contains('Media_webrtc_participants-requests-media')) this.mediaRequestStatusEl.classList.add('Media_webrtc_participants-requests-media');

                            function cntDown() {
                                if (participantListItem.cameraRequestTimer) {
                                    clearInterval(participantListItem.cameraRequestTimer);
                                    participantListItem.cameraRequestTimer = null;
                                    requestTimer.style.display = '';
                                }

                                requestTimer.style.display = 'flex'
                                let sec = Math.round(waitingTime / 1000);
                                participantListItem.cameraRequestTimer = setInterval(() => {
                                    requestTimer.innerHTML = sec--;
                                    if (sec < 0) {
                                        requestTimer.style.display = '';
                                        clearInterval(participantListItem.cameraRequestTimer);
                                        participantListItem.cameraRequestTimer = null;
                                        participantListItem.hideMediaRequestIcon('camera')
                                    }
                                }, 1000);

                            }

                            cntDown();
                        } else {
                            let micRequestCon = document.createElement('DIV');
                            micRequestCon.className = 'Media_webrtc_mic_request_con';
                            let iconCon = document.createElement('DIV');
                            iconCon.className = 'Media_webrtc_mic_request_icon';
                            iconCon.innerHTML = _controlsToolIcons.microphoneRequest;
                            let requestTimer = document.createElement('DIV');
                            requestTimer.className = 'Media_webrtc_mic_request_timer';
                            micRequestCon.appendChild(iconCon)
                            micRequestCon.appendChild(requestTimer)
                            this.mediaRequestStatusEl.appendChild(micRequestCon)

                            if (!this.mediaRequestStatusEl.classList.contains('Media_webrtc_participants-requests-media')) this.mediaRequestStatusEl.classList.add('Media_webrtc_participants-requests-media');

                            function cntDown() {
                                if (participantListItem.micRequestTimer) {
                                    clearInterval(participantListItem.micRequestTimer);
                                    participantListItem.micRequestTimer = null;
                                    requestTimer.style.display = '';
                                }

                                requestTimer.style.display = 'flex'
                                let sec = Math.round(waitingTime / 1000);
                                participantListItem.micRequestTimer = setInterval(() => {
                                    requestTimer.innerHTML = sec--;
                                    if (sec < 0) {
                                        requestTimer.style.display = '';
                                        clearInterval(participantListItem.micRequestTimer);
                                        participantListItem.micRequestTimer = null;
                                        participantListItem.hideMediaRequestIcon('mic')
                                    }
                                }, 1000);

                            }

                            cntDown();
                        }

                    };
                    this.hideMediaRequestIcon = function (type) {
                        log('controls: hideMediaRequestIcon', type);
                        let camIcon = this.mediaRequestStatusEl.querySelector('.Media_webrtc_camera_request_con');
                        let micIcon = this.mediaRequestStatusEl.querySelector('.Media_webrtc_mic_request_con');
                        if (type == 'camera') {
                            if (camIcon && camIcon.parentElement) camIcon.parentElement.removeChild(camIcon);
                            camIcon == null;
                        } else {
                            if (micIcon && micIcon.parentElement) micIcon.parentElement.removeChild(micIcon);
                            micIcon = null;
                        }

                        if (!camIcon && !micIcon && this.mediaRequestStatusEl.classList.contains('Media_webrtc_participants-requests-media')) {
                            this.mediaRequestStatusEl.classList.remove('Media_webrtc_participants-requests-media');
                        }
                    };
                }
                log('controls: addItem');
                var isLocal = roomParticipant.isLocal;
                var participantItem = document.createElement('LI');
                tool.participantListEl.appendChild(participantItem);
                
                var tracksControlBtns = document.createElement('DIV');
                tracksControlBtns.className = 'Media_webrtc_tracks-control';
                participantItem.appendChild(tracksControlBtns);

                var muteVideo = document.createElement('DIV');
                muteVideo.className = 'Media_webrtc_mute-video-btn' + (isLocal ? ' Media_webrtc_isLocal' : '');
                if (!tool.webrtcUserInterface.getOptions().audioOnlyMode) tracksControlBtns.appendChild(muteVideo);

                var muteCameraBtn = document.createElement('DIV');
                muteCameraBtn.className = 'Media_webrtc_mute-camera-btn';
                muteCameraBtn.dataset.touchlabel = Q.getObject("webrtc.participantsPopup.turnOffCamera", tool.text);
                muteCameraBtn.innerHTML = _controlsToolIcons.cameraTransparent;
                muteVideo.appendChild(muteCameraBtn);

                var muteScreenSharingBtn = document.createElement('DIV');
                muteScreenSharingBtn.className = 'Media_webrtc_mute-screensharing-btn';
                muteScreenSharingBtn.dataset.touchlabel = Q.getObject("webrtc.participantsPopup.turnOffScreenSharing", tool.text);
                muteScreenSharingBtn.innerHTML = _participantsToolIcons.disabledScreen;
                muteVideo.appendChild(muteScreenSharingBtn);

                var muteAudioBtn = document.createElement('DIV');
                muteAudioBtn.className = 'Media_webrtc_mute-audio-btn' + (isLocal ? ' Media_webrtc_isLocal' : '');
                muteAudioBtn.dataset.touchlabel = isLocal ? (tool.webrtcSignalingLib.localMediaControls.micIsEnabled() ? Q.getObject("webrtc.participantsPopup.turnOffAudio", tool.text) : Q.getObject("webrtc.participantsPopup.turnOnAudio", tool.text)) : Q.getObject("webrtc.participantsPopup.turnOffAudio", tool.text);
                muteAudioBtn.innerHTML = isLocal ? (tool.webrtcSignalingLib.localMediaControls.micIsEnabled() ? _controlsToolIcons.microphoneTransparent : _participantsToolIcons.locDisabledMic) : _participantsToolIcons.loudSpeaker;
                tracksControlBtns.appendChild(muteAudioBtn);

                var participantIdentity = document.createElement('DIV');
                participantIdentity.className = 'Media_webrtc_participants-identity';
                participantItem.appendChild(participantIdentity);

                var participantIdentityIcon = document.createElement('DIV');
                participantIdentity.appendChild(participantIdentityIcon);
                var userId = roomParticipant.identity != null ? roomParticipant.identity.split('\t')[0] : Q.Users.loggedInUser.id;
                Q.activate(
                    Q.Tool.setUpElement(
                        participantIdentityIcon, // or pass an existing element
                        "Users/avatar",
                        {
                            userId: userId,
                            contents: false
                        }
                    )
                );
                //$(participantIdentityText).tool('Users/avatar', { userId: userId }).activate();
                //participantIdentityText.innerHTML = isLocal ? roomParticipant.identity + ' <span style="font-weight: normal;font-style: italic;">(me)</span>' : roomParticipant.identity;
                var liveStatus = document.createElement('DIV');
                liveStatus.className = 'Media_webrtc_participants-live-status';
                participantIdentity.appendChild(liveStatus);
                if (roomParticipant.fbLiveStreamingActive) liveStatus.classList.add('isRecording');

                //container for icons when some user requests camera/mic
                var requestStatus = document.createElement('DIV');
                requestStatus.className = 'Media_webrtc_participants-requests-status';
                participantIdentity.appendChild(requestStatus);
                //liveStatus.innerHTML = _controlsToolIcons.facebookLive;

                var participantIdentityText = document.createElement('DIV');
                participantIdentity.appendChild(participantIdentityText);
                //fullName.innerHTML = roomParticipant.userName;
                Q.activate(
                    Q.Tool.setUpElement(
                        participantIdentityText, // or pass an existing element
                        "Users/avatar",
                        {
                            userId: userId,
                            icon: false
                        }
                    )
                );

                /*var audioVisualization = document.createElement('DIV')
                audioVisualization.className = 'Media_webrtc_popup-visualization';
                participantIdentity.appendChild(audioVisualization);*/

                var participantsMenu = document.createElement('DIV');
                participantsMenu.className = 'Media_webrtc_participants-menu';
                participantsMenu.innerHTML = _controlsToolIcons.dots;
                participantsMenu.dataset.touchlabel = 'More';

                if (!roomParticipant.isLocal && !roomParticipant.access.isAdmin) {
                    participantItem.appendChild(participantsMenu);
                }

                var listItem = new ListItem();
                listItem.participant = roomParticipant;
                listItem.listElement = participantItem;
                listItem.videoBtnsEl = muteVideo;
                listItem.cameraBtnEl = muteCameraBtn;
                listItem.screenSharingBtnEl = muteScreenSharingBtn;
                listItem.audioBtnEl = muteAudioBtn;
                listItem.liveStatusEl = liveStatus;
                listItem.mediaRequestStatusEl = requestStatus;
                listItem.moreOptionsBtn = participantsMenu;
                tool.participantsList.push(listItem);

                muteAudioBtn.addEventListener('click', function (e) {
                    listItem.toggleAudio(true);
                });
                muteCameraBtn.addEventListener('click', function (e) {
                    listItem.toggleScreen(true);
                });
                muteScreenSharingBtn.addEventListener('click', function (e) {
                    listItem.toggleScreenSharingScreen();
                });


                let optionsMenu = createMoreOptionsPopup();
                listItem.moreOptionsMenu = optionsMenu;
                listItem.moreOptionsMenu.menuTriggerButton = participantsMenu;

                Q.activate(
                    Q.Tool.setUpElement(
                        participantsMenu,
                        "Media/webrtc/popupDialog",
                        {
                            content: optionsMenu.menuEl,
                            className: 'participants-popup-more-options',
                            triggerOn: 'lmb',
                            parent: participantItem
                        }
                    ),
                    {},
                    function () {
                        listItem.moreOptionsPopup = this;
                    }
                );

                tool.updateItem(roomParticipant);
                
                function createMoreOptionsPopup() {
                    var userId = roomParticipant.identity != null ? roomParticipant.identity.split('\t')[0] : null;
                    var localParticipant = tool.webrtcSignalingLib.localParticipant();

                    var optionsMenuCon = document.createElement('DIV');
                    optionsMenuCon.className = 'Media_webrtc_participants-options';
                    var optionsMenuInner = document.createElement('UL');
                    optionsMenuInner.className = 'Media_webrtc_participants-options-inner';
                    optionsMenuCon.append(optionsMenuInner);

                    var moveToWaitingRoom = document.createElement('LI');
                    moveToWaitingRoom.className = 'Media_webrtc_participants-options-waiting';
                    moveToWaitingRoom.innerHTML = 'Put in waiting room';
                    optionsMenuCon.append(moveToWaitingRoom);

                    moveToWaitingRoom.addEventListener('click', function () {
                        Q.req("Media/webrtc", ["cancelAccessToRoom"], function (err, response) {
                            var msg = Q.firstErrorMessage(err, response && response.errors);
        
                            if (msg) {
                                return console.error(msg);
                            }
                            var socket = tool.webrtcSignalingLib.socketConnection();
                            socket.emit('Media/webrtc/putInWaitingRoom', { userId: userId })
                        }, {
                            method: 'post',
                            fields: {
                                publisherId: tool.roomStream.fields.publisherId,
                                streamName: tool.roomStream.fields.name,
                                userId: userId
                            }
                        });

                        listItem.moreOptionsPopup.hide();
                    });

                    var makeHost = document.createElement('LI');
                    makeHost.className = 'Media_webrtc_participants-options-host';
                    makeHost.innerHTML = 'Make a host';
                    //optionsMenuCon.append(makeHost);

                    makeHost.addEventListener('click', function () {    
                        addOrRemoveCohost(userId, 'add');
                    });

                    var removeHost = document.createElement('LI');
                    removeHost.className = 'Media_webrtc_participants-options-host';
                    removeHost.innerHTML = 'Remove host role';
                    //optionsMenuCon.append(removeHost);

                    removeHost.addEventListener('click', function () {
                        addOrRemoveCohost(userId, 'remove');
                    });

                    function addOrRemoveCohost(userId, actionToDo) {
                        Q.req("Media/webrtc", ["addOrRemoveCohost"], function (err, response) {
                            var msg = Q.firstErrorMessage(err, response && response.errors);
        
                            if (msg) {
                                return console.error(msg);
                            }
                        }, {
                            method: 'post',
                            fields: {
                                publisherId: tool.roomStream.fields.publisherId,
                                streamName: tool.roomStream.fields.name,
                                userId: userId,
                                actionToDo: actionToDo
                            }
                        });

                        listItem.moreOptionsPopup.hide();
                    }

                    function updateMenuItems() {
                        if(localParticipant.access.isCohost || localParticipant.access.isAdmin) {
                            optionsMenuCon.append(moveToWaitingRoom);
                        } else {
                            if(moveToWaitingRoom.parentElement) {
                                moveToWaitingRoom.parentElement.removeChild(moveToWaitingRoom);
                            }
                        }

                        if(!roomParticipant.access.isCohost && localParticipant.access.isAdmin) {
                            if(removeHost.parentElement) {
                                removeHost.parentElement.removeChild(removeHost);
                            }
                            optionsMenuCon.append(makeHost);
                        } else if (roomParticipant.access.isCohost && localParticipant.access.isAdmin) {
                            if(makeHost.parentElement) {
                                makeHost.parentElement.removeChild(makeHost);
                            }
                            optionsMenuCon.append(removeHost);
                        } else {
                            if(removeHost.parentElement) {
                                removeHost.parentElement.removeChild(removeHost);
                            }
                            if(makeHost.parentElement) {
                                makeHost.parentElement.removeChild(makeHost);
                            }
                        }
                    }                    
                    
                    updateMenuItems();

                    return {
                        menuEl: optionsMenuCon,
                        updateMenuItems: updateMenuItems
                    };
                }

            },
            /**
            * Remove item from participants list participants list
            * @method removeItem
            */
            removeItem: function (participant) {
                var tool = this;
                var item = tool.participantsList.filter(function (listItem) {
                    return listItem.participant.sid == participant.sid;
                })[0];
                if (item != null) item.remove();
            },
            updateItem: function update(participant) {
                var tool = this;
                var localParticipant = tool.webrtcSignalingLib.localParticipant();

                for (let i in tool.participantsList) {
                    let item = tool.participantsList[i];
                    if (participant != item.participant) continue;

                    let activeCameraScreens = 0;
                    let activeScreenSharingScreens = 0;
                    for (let s in participant.screens) {
                        if (participant.screens[s].isActive) {
                            if (!participant.screens[s].screensharing) {
                                activeCameraScreens++;
                            } else {
                                activeScreenSharingScreens++;
                            }

                        }
                    }
                    if (activeCameraScreens == 0) {
                        item.muteVideo();
                    } else {
                        item.unmuteVideo();
                    }

                    if (activeCameraScreens == 0 && activeScreenSharingScreens != 0) {
                        item.videoBtnsEl.classList.add('Media_webrtc_no-camera-video')
                    } else {
                        item.videoBtnsEl.classList.remove('Media_webrtc_no-camera-video')
                    }


                    if (participant.isLocal) {

                        if (!tool.webrtcSignalingLib.localMediaControls.micIsEnabled()) {
                            item.audioBtnEl.innerHTML = _participantsToolIcons.locDisabledMic;
                            item.audioBtnEl.dataset.touchlabel = Q.getObject("webrtc.participantsPopup.turnOnAudio", tool.text);
                        } else {
                            item.audioBtnEl.innerHTML = _controlsToolIcons.microphoneTransparent;
                            item.audioBtnEl.dataset.touchlabel = Q.getObject("webrtc.participantsPopup.turnOffAudio", tool.text);
                        }
                    } else {
                        if (!participant.audioIsMuted) {
                            item.toggleAudioIcon(true);
                        } else {
                            item.toggleAudioIcon(false);
                        }
                    }

                    if (activeScreenSharingScreens == 0) {
                        item.muteScreenSharingVideo();
                        item.videoBtnsEl.classList.remove('Media_webrtc_screensharing-active')

                    } else {
                        item.unmuteScreenSharingVideo();
                        item.videoBtnsEl.classList.add('Media_webrtc_screensharing-active')
                    }

                    if(participant.access.isCohost || participant.access.isAdmin) {
                        item.listElement.classList.add('Media_webrtc_participants_host')
                    } else {
                        item.listElement.classList.remove('Media_webrtc_participants_host')
                    }

                    if(item.moreOptionsMenu) {
                        if (item.moreOptionsMenu.menuTriggerButton) {
                            if (((localParticipant.access.isCohost || localParticipant.access.isAdmin) && !item.participant.access.isCohost  && !item.participant.access.isAdmin)
                            || localParticipant.access.isAdmin) {
                                item.moreOptionsMenu.menuTriggerButton.style.display = 'block';
                            } else {
                                item.moreOptionsMenu.menuTriggerButton.style.display = '';
                            }
                        }
                        item.moreOptionsMenu.updateMenuItems(); 
                    }

                    break;
                }

            },
            showScreen: function (screen, manually) {
                var tool = this;
                var i, listItem;
                for (i = 0; listItem = tool.participantsList[i]; i++) {
                    if (listItem.participant != screen.participant) continue;

                    listItem.showPartcicipantScreens(screen, manually);
                }
            },
            showLiveIndicator: function (participant, platform) {
                var tool = this;
                for (let i in tool.participantsList) {
                    let item = tool.participantsList[i];
                    if (participant != item.participant) continue;
                    item.showLiveIcon(platform);
                    break;
                }
            },
            hideLiveIndicator: function (participant, platform) {
                var tool = this;
                log('controls: hideLiveIndicator');

                for (let i in tool.participantsList) {
                    let item = tool.participantsList[i];
                    if (participant != item.participant) continue;

                    item.hideLiveIcon(platform);
                    break;
                }
            },
            showMediaRequestIndicator: function (e, type) {
                var tool = this;
                let participant = e.participant;
                log('controls: showMediaRequestIndicator', participant);
                for (let i in tool.participantsList) {
                    let item = tool.participantsList[i];
                    if (participant != item.participant) continue;
                    item.showMediaRequestIcon(type, e.waitingTime);
                    break;
                }
            },
            hideMediaRequestIndicator: function (e, type) {
                var tool = this;
                let participant = e.participant;
                log('controls: hideMediaRequestIndicator', participant);
                for (let i in tool.participantsList) {
                    let item = tool.participantsList[i];
                    if (participant != item.participant) continue;

                    item.hideMediaRequestIcon(type);
                    break;
                }
            },
            log: function log(text) {
                var tool = this;
                //if (!tool.state.debug.controls) return;
                var args = Array.prototype.slice.call(arguments);
                var params = [];

                if (window.performance) {
                    var now = (window.performance.now() / 1000).toFixed(3);
                    params.push(now + ": " + args.splice(0, 1));
                    params = params.concat(args);
                    console.log.apply(console, params);
                } else {
                    params.push(text);
                    params = params.concat(args);
                    console.log.apply(console, params);
                }

                if (tool.webrtcSignalingLib) tool.webrtcSignalingLib.event.dispatch('log', params);
            }
        }

    );

})(window.jQuery, window);