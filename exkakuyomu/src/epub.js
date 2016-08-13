"use strict";

function escapeTitle(title){
    return title.replace(/([^0-9])([0-9]{1,2})(?![0-9])/g, function(_, a, b){
        var table = {
            "0": "０",
            "1": "１",
            "2": "２",
            "3": "３",
            "4": "４",
            "5": "５",
            "6": "６",
            "7": "７",
            "8": "８",
            "9": "９"
        };
        return a + table[b[0]] + (b[1] ? table[b[1]] : "");
    });
}

function createEpub(work, callback){

    var coverTable = {
        "ファンタジー": "fantasy.jpg",
        "SF": "sf.jpg",
        "恋愛・ラブコメ": "love.jpg",
        "現代アクション": "action.jpg",
        "現代ドラマ": "drama.jpg",
        "ホラー": "horror.jpg",
        "ミステリー": "mystery.jpg",
        "歴史・時代": "history.jpg",
        "エッセイ・ノンフィクション": 'cover.jpg',
        "創作論・評論": 'cover.jpg',
        "その他": 'cover.jpg'
    };

    get(chrome.extension.getURL("template/style.css"), function(style) {
        getImage(chrome.extension.getURL("cover/" + coverTable[work.genre]), function(image) {
            get(chrome.extension.getURL("template/container.xml"), function(container) {
                get(chrome.extension.getURL("template/bodymatter.xhtml"), function(bodymatterSource) {
                    get(chrome.extension.getURL("template/nav.xhtml"), function(navSource) {
                        get(chrome.extension.getURL("template/toc.xhtml"), function(tocSource) {
                            get(chrome.extension.getURL("template/content.xml"), function(contentSource) {

                                var episodes = work.episodes;
                                var title = work.title;
                                var author = work.author;
                                var color = work.color;
                                var genres = work.genre;
                                var catchphrase = work.catchphrase;

                                var bodymatters = [];

                                var zip = new JSZip();
                                zip.file("mimetype", "application/epub+zip");

                                var metainf = zip.folder("META-INF");
                                metainf.file("container.xml", container);

                                var oebps = zip.folder("OEBPS");

                                var navDom = (new window.DOMParser()).parseFromString(navSource, "text/xml");
                                navDom.querySelector("title").textContent = work.title;
                                episodes.map(function(episode, index) {
                                    var span = document.createElement("span");
                                    span.textContent = escapeTitle(episode.name);

                                    var a = document.createElement("a");
                                    a.setAttribute("href", `bodymatter_${padzero(index)}.xhtml`);
                                    a.appendChild(span);
                                    var li = document.createElement("li");
                                    li.appendChild(a);
                                    navDom.querySelector("#toc ol").appendChild(li);

                                    var span = document.createElement("span");
                                    span.textContent = escapeTitle(episode.name);
                                    var a = document.createElement("a");
                                    a.setAttribute("epub:type", "bodymatter");
                                    a.setAttribute("href", `bodymatter_${padzero(index)}.xhtml`);
                                    a.appendChild(span);
                                    var li = document.createElement("li");
                                    li.appendChild(a);

                                    navDom.querySelector("#landmarks ol").appendChild(li);
                                });
                                oebps.file(`nav.xhtml`, (new XMLSerializer()).serializeToString(navDom));

                                var contentDom = (new window.DOMParser()).parseFromString(contentSource, "text/xml");
                                contentDom.querySelector('#identifier0').textContent = `urn:uuid:${work.uuid}`;
                                contentDom.querySelector("#title0").textContent = work.title;
                                contentDom.querySelector("#creator0").textContent = work.author;
                                contentDom.querySelector('metadata meta[property="dcterms:modified"]').textContent = toISOString(new Date());
                                episodes.map(function(episode, index) {
                                    var item = contentDom.createElement("item");
                                    item.setAttribute("media-type", "application/xhtml+xml");
                                    item.setAttribute("href", `bodymatter_${padzero(index)}.xhtml`);
                                    item.setAttribute("id", `_bodymatter_${padzero(index)}.xhtml`);
                                    contentDom.querySelector("manifest").insertBefore(item, contentDom.querySelector("#_toc.ncx"));

                                    var itemref = contentDom.createElement("itemref");
                                    itemref.setAttribute("idref", `_bodymatter_${padzero(index)}.xhtml`);
                                    contentDom.querySelector("spine").appendChild(itemref);

                                    var e = contentDom.createElement("reference");
                                    e.setAttribute("type", "text");
                                    e.setAttribute("title", escapeTitle(episode.name));
                                    e.setAttribute("href", `bodymatter_${padzero(index)}.xhtml`);
                                    contentDom.querySelector("guide").appendChild(e);
                                });
                                oebps.file("content.opf", (new XMLSerializer()).serializeToString(contentDom));

                                var canvas = document.createElement("canvas");
                                canvas.width = image.width;
                                canvas.height = image.height;
                                var g = canvas.getContext("2d");
                                g.drawImage(image, 0, 0);
                                g.textBaseline = "top";
                                g.fillStyle = "black";
                                g.font = ((image.width - 400) / title.length).toFixed() + "px serif";
                                g.fillText(title, 200, 600);
                                g.font = "100px serif";
                                g.fillText(author, 200, 900);

                                var s = 20;
                                g.fillStyle = color;
                                g.fillRect(0, 0, canvas.width, s);
                                g.fillRect(0, canvas.height - 400, canvas.width, 400);
                                g.fillRect(0, 0, s, canvas.height);
                                g.fillRect(canvas.width - s, 0, s, canvas.height);

                                if (work.catchphrase) {
                                    g.font = ((image.width - 40) / work.catchphrase.length * 2).toFixed() + "px serif";
                                    g.fillStyle = "white";
                                    g.fillText(work.catchphrase, 20, 1400);
                                }

                                var tocDom = (new window.DOMParser()).parseFromString(tocSource, "text/xml");
                                tocDom.querySelector('head meta[name="dtb:uid"]').setAttribute("content", `urn:uuid:${work.uuid}`);
                                tocDom.querySelector("docTitle text").textContent = work.title;
                                tocDom.querySelector("navPoint content").setAttribute("src", `bodymatter_${padzero(0)}.xhtml`);
                                oebps.file("toc.ncx", (new XMLSerializer()).serializeToString(tocDom));

                                oebps.file("style.css", style);
                                var imageDataURL = canvas.toDataURL();
                                oebps.file("cover.png", imageDataURL.substr(imageDataURL.indexOf(',') + 1), {
                                    base64: true
                                });

                                episodes.forEach(function(episode, i){
                                    var dom = (new window.DOMParser()).parseFromString(bodymatterSource, "text/xml");
                                    dom.querySelector("title").textContent = title;
                                    dom.querySelector("#episodeName").textContent = escapeTagChars(escapeTitle(episode.name));
                                    dom.querySelector("#episodeBody").innerHTML = sourceToHTML(escapeTitle(episode.source));
                                    oebps.file(`bodymatter_${padzero(i)}.xhtml`, (new XMLSerializer()).serializeToString(dom));
                                });

                                zip.generateAsync({
                                    type: "blob"
                                }).then(callback);
                            });
                        });
                    });
                });
            });
        });
    });
}
