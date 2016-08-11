"use strict";

function createEpub(work, callback){

    var coverTable = {
        "ファンタジー": "cover/fantasy.jpg",
        "SF": "cover/sf.jpg",
        "恋愛・ラブコメ": "cover/love.jpg",
        "現代アクション": "cover/action.jpg",
        "現代ドラマ": "cover/drama.jpg",
        "ホラー": "cover/horror.jpg",
        "ミステリー": "cover/mystery.jpg",
        "歴史・時代": "cover/history.jpg",
        "エッセイ・ノンフィクション": 'cover/cover.jpg',
        "創作論・評論": 'cover/cover.jpg',
        "その他": 'cover/cover.jpg'
    };

    get(chrome.extension.getURL("src/style.css"), function(style) {
        getImage(chrome.extension.getURL(coverTable[work.genre]), function(image) {
            get(chrome.extension.getURL("src/container.xml"), function(container) {

                var episodes = work.episodes;
                var title = work.title;
                var author = work.author;
                var color = work.color;
                var genres = work.genre;
                var catchphrase = work.catchphrase;

                var bodymatters = [];

                var items = episodes.map(function(episode, index) {
                    var item = document.createElement("item");
                    item.setAttribute("media-type", "application/xhtml+xml");
                    item.setAttribute("href", `bodymatter_${padzero(index)}.xhtml`);
                    item.setAttribute("id", `_bodymatter_${padzero(index)}.xhtml`);
                    return item.outerHTML;
                });

                var itemrefs = episodes.map(function(episode, index) {
                    var itemref = document.createElement("itemref");
                    itemref.setAttribute("idref", `_bodymatter_${padzero(index)}.xhtml`);
                    return itemref.outerHTML;
                });

                var episodeLinks = episodes.map(function(episode, index) {
                    var span = document.createElement("span");
                    span.textContent = episode.name;

                    var a = document.createElement("a");
                    a.setAttribute("epub:type", "bodymatter");
                    a.setAttribute("href", `bodymatter_${padzero(index)}.xhtml`);
                    a.appendChild(span);

                    var li = document.createElement("li");
                    li.appendChild(a);

                    return li.outerHTML;
                });


                var indexLinks = episodes.map(function(episode, index) {
                    var span = document.createElement("span");
                    span.textContent = episode.name;

                    var a = document.createElement("a");
                    a.setAttribute("href", `bodymatter_${padzero(index)}.xhtml`);
                    a.appendChild(span);

                    var li = document.createElement("li");
                    li.appendChild(a);

                    return li.outerHTML;
                });

                var references = episodes.map(function(episode, index) {
                    var e = document.createElement("reference");
                    e.setAttribute("type", "text");
                    e.setAttribute("title", episode.name);
                    e.setAttribute("href", `bodymatter_${padzero(index)}.xhtml`);
                    return e.outerHTML;
                });

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

                var content =
                    `<?xml version="1.0" encoding="UTF-8"?>
            <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="identifier0" version="3.0" prefix="ibooks: http://vocabulary.itunes.apple.com/rdf/ibooks/vocabulary-extensions-1.0/">
            <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
                <meta name="cover" content="cover" />
                <dc:identifier id="identifier0">urn:uuid:${work.uuid}</dc:identifier>
                <meta refines="#identifier0" property="identifier-type" scheme="xsd:string">uuid</meta>
                <dc:title id="title0">${work.title}</dc:title>
                <meta refines="#title0" property="display-seq">1</meta>
                <dc:creator id="creator0">${work.author}</dc:creator>
                <meta refines="#creator0" property="display-seq">1</meta>
                <dc:format>application/epub+zip</dc:format>
                <dc:language>ja</dc:language>
                <meta property="ibooks:specified-fonts">true</meta>
                <meta property="dcterms:modified">${toISOString(new Date())}</meta>
            </metadata>
            <manifest>
                <item id="cover" href="cover.png" properties="cover-image" media-type="image/png" />
                <item media-type="text/css" href="style.css" id="_style.css" />
                <item media-type="application/xhtml+xml" href="nav.xhtml" id="_nav.xhtml" properties="nav" />
                ${items.join("\n")}
                <item media-type="application/x-dtbncx+xml" href="toc.ncx" id="_toc.ncx" />
            </manifest>
            <spine page-progression-direction="rtl" toc="_toc.ncx">
                <itemref idref="_nav.xhtml" />
                ${itemrefs.join("\n")}
            </spine>
            <guide>
                <reference type="toc" title="目次" href="nav.xhtml" />
                ${references.join("\n")}
            </guide>
            </package>`;

                var toc =
                    `<?xml version="1.0" encoding="UTF-8"?>
            <ncx xmlns:ncx="http://www.daisy.org/z3986/2005/ncx/"
            xmlns="http://www.daisy.org/z3986/2005/ncx/"
            version="2005-1"
            xml:lang="ja">
            <head>
                <meta name="dtb:uid" content="urn:uuid:${work.uuid}"/>
                <meta name="dtb:depth" content="1"/>
                <meta name="dtb:totalPageCount" content="0"/>
                <meta name="dtb:maxPageNumber" content="0"/>
            </head>
            <docTitle>
                <text>${work.title}</text>
            </docTitle>
            <navMap>
            <navPoint id="bodymatter_0_0.xhtml" playOrder="1">
                <navLabel>
                    <text>スタートページ</text>
                </navLabel>
                <content src="bodymatter_${padzero(0)}.xhtml" />
            </navPoint>
            </navMap>
            </ncx>`;

                var nav =
                    `<?xml version="1.0" encoding="UTF-8"?>
            <!DOCTYPE html>

            <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ja" lang="ja">
            <head>
                <meta charset="utf-8" />
                <link rel="stylesheet" href="style.css" type="text/css" />
                <title>${work.title}</title>
                <style type="text/css">
                    nav ol {list-style-type: none;}
                </style>
            </head>
            <body class="frontmatter" epub:type="frontmatter">
                <nav id="toc" class="toc" epub:type="toc">
                    <h2>目次</h2>
                    <ol>${indexLinks.join("\n")}</ol>
                </nav>
                <nav id="landmarks" class="landmarks" epub:type="landmarks" hidden="hidden">
                    <h2>ガイド</h2>
                    <ol>
                        <li><a epub:type="toc" href="nav.xhtml"><span>目次</span></a></li>
                        ${episodeLinks.join("\n")}
                    </ol>
                </nav>
            </body>
            </html>`;

                var zip = new JSZip();
                zip.file("mimetype", "application/epub+zip");

                var metainf = zip.folder("META-INF");
                metainf.file("container.xml", container);

                var oebps = zip.folder("OEBPS");
                oebps.file("content.opf", content);
                oebps.file("toc.ncx", toc);
                oebps.file("nav.xhtml", nav);
                oebps.file("style.css", style);
                var imageDataURL = canvas.toDataURL();
                oebps.file("cover.png", imageDataURL.substr(imageDataURL.indexOf(',') + 1), {
                    base64: true
                });

                episodes.forEach(function(episode, i){
                    var episodeName = escapeTagChars(episode.name);
                    oebps.file(`bodymatter_${padzero(i)}.xhtml`,
    `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE html>
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ja" lang="ja">
    <head>
        <meta charset="utf-8" />
        <link rel="stylesheet" href="style.css" type="text/css" />
        <title>${title}</title>
    </head>
    <body class="bodymatter" epub:type="bodymatter">
        <h3>${episodeName}</h3>
        ${sourceToHTML(episode.source)}
    </body>
    </html>`);

                });

                zip.generateAsync({
                    type: "blob"
                }).then(callback);
            });
        });
    });
}
