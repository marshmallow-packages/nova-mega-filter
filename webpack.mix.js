let mix = require("laravel-mix");
let path = require("path");

require("./nova.mix");
require("mix-tailwindcss");

mix.setPublicPath("dist")
    .js("resources/js/card.js", "js")
    .vue({ version: 3 })
    .postCss("resources/css/card.css", "css")
    .tailwind()
    .alias({
        "@": path.join(__dirname, "resources/js/"),
    })
    .nova("marshmallow/nova-mega-filter");
