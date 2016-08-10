function htmlToSource(html){
    var source = "";
    var el = document.createElement('html');
    el.innerHTML = html;
    var bodies = el.querySelectorAll('div.widget-episodeBody p');
    for (var i = 0; i < bodies.length; i++) {
        var body = bodies[i];
        if (body.classList.contains("blank")) {
            source += "\n";
        } else {
            for (var k = 0; k < body.childNodes.length; k++) {
                var child = body.childNodes[k];
                if (child.nodeType === Node.TEXT_NODE) {
                    source += child.textContent;
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    if (child.tagName === "RUBY") {
                        source += "|" + child.querySelector("rb").textContent + "《" + child.querySelector("rt").textContent + "》";
                    } else if (child.tagName === "EM") {
                        source += "《《" + child.textContent + "》》";
                    } else {
                        console.log("ERROR: Unexpected Element");
                    }
                } else {
                    console.log("ERROR: Unexpected Node");
                }
            }
            source += "\n";
        }
    }
    return source;
}

function sourceToHTML(source){
    var escaped = escapeTagChars(source);
    var bouten = escaped.replace(/《《(.+?)》》/g, function(_, tango) {
        var xs = "";
        for (var i = 0; i < tango.length; i++) {
            xs += `<ruby>${tango[i]}<rt>丶</rt></ruby>`
        }
        return xs;
    });

    // NOTE: EPUB Validator complains about the rb element
    var ruby = bouten.replace(/\|(.+?)《(.+?)》/g, function(_, tango, yomi) {
        return `<ruby>${tango}<rt>${yomi}</rt></ruby>`;
    });
    return ruby;
}
