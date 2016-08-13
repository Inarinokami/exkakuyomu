"use strict";

const timespan = 1; // secs / episode
const tasks = {};
const ports = [];
var pageview = true;

function updatePopup() {
    ports.forEach(function(p){
        p.postMessage({
            tasks: tasks,
            pageview: pageview
        });
    });
}

function getWorkDescription(workID, callback) {
    get("https://kakuyomu.jp/works/" + workID, function(responseText) {
        var episodeList = [];
        var el = document.createElement('html');
        el.innerHTML = responseText;
        var episodes = el.querySelectorAll('ol.widget-toc-items li.widget-toc-episode');
        for (var i = 0; i < episodes.length; i++) {
            var episode = episodes[i];
            var links = episode.querySelectorAll("a");
            for (var l = 0; l < links.length; l++) {
                var link = links[l];
                if (link.classList.contains("widget-toc-episode-editLink")) {
                    // link for edit, ignore
                } else {
                    episodeList.push({
                        name: episode.querySelector("span.widget-toc-episode-titleLabel").textContent,
                        url: link.getAttribute("href")
                    });
                }
            }
        }

        function extractIntroduction(elements){
            var text = "";
            for (var i = 0; i < elements.length; i++) {
                var e = elements[i];
                switch(e.nodeType){
                    case Node.ELEMENT_NODE:
                        if(e.tagName === "BR"){
                            //text += "\n";
                        }else if(e.tagName === "SPAN" && e.classList.contains("ui-truncateText-restText")){
                            text += extractIntroduction(e.childNodes);
                        }
                        break;
                    case Node.TEXT_NODE:
                        text += e.textContent;
                        break;
                    default:
                        break;
                }
            }
            return text;
        }

        callback({
            episodes: episodeList,
            title: el.querySelector("h1#workTitle").textContent,
            author: el.querySelector("span#workAuthor-activityName a").textContent,
            color: el.querySelector("p#workColor").style.backgroundColor,
            genre: el.querySelector("#workGenre a").textContent,
            catchphrase: el.querySelector("span#catchphrase-body") && el.querySelector("span#catchphrase-body").textContent,
            introduction: extractIntroduction(el.querySelector('#introduction').childNodes)
        });
    });
}

function getEpisodeSource(episodeURL, callback) {
    get("https://kakuyomu.jp" + episodeURL, function(responseText) {

        // give page views
        if(pageview){
            post(`https://kakuyomu.jp${episodeURL}/read`, function(){
            });
        }

        callback(htmlToSource(responseText));
    });
}

function downloadAsText(id) {
    getWorkDescription(id, function(work) {
        var i = 0;
        var episodes = work.episodes;
        var title = work.title;
        var author = work.author;
        var zip = new JSZip();
        var uuid = generateUUID();
        tasks[uuid] = {
            uuid: uuid,
            title: title,
            status: 0,
            length: episodes.length
        };

        zip.file("description.txt",
`【作品名】${work.title}
【作者】${work.author}
【イメージカラー】${work.color}
【ジャンル】${work.genre}
【キャッチフレーズ】${work.catchphrase}
【あらすじ】
${work.introduction}`);

        function next() {
            if( ! tasks[uuid]){
                // canceled
            }else if (i < episodes.length) {
                var episode = episodes[i];
                var episodeName = escapeTagChars(episode.name);
                getEpisodeSource(episode.url, function(source) {
                    console.log("Downloading \"" + episodeName + "\"...");
                    zip.file("episode_" + padzero(i) + ".txt", "# " + episodeName + "\n\n" + source);
                    i += 1;
                    tasks[uuid].status = i;
                    updatePopup();
                    setTimeout(next, timespan * 1000);
                });
            } else {
                zip.generateAsync({
                    type: "blob"
                }).then(function(content) {
                    download(`${author}『${title}』.zip`, content);
                    delete tasks[uuid];
                    updatePopup();
                });
            }
        }

        next();
    });
}

function downloadAsEpub(id) {

    var uuid = generateUUID();

    getWorkDescription(id, function(work) {

        var episodes = work.episodes;
        var title = work.title;
        var author = work.author;
        var color = work.color;
        var genres = work.genre;
        var catchphrase = work.catchphrase;

        tasks[uuid] = {
            uuid: uuid,
            title: work.title,
            author: work.author,
            color: work.color,
            genre: work.genre,
            catchphrase: work.catchphrase,
            episodes: work.episodes,
            status: 0,
            length: episodes.length
        };
        updatePopup();


        var i = 0;

        function next() {
            if ( ! tasks[uuid]) {
                // task canceled
            } else{
                var episode = episodes[i];
                var episodeName = escapeTagChars(episode.name);
                console.log("Downloading \"" + episode.name + "\"...");
                getEpisodeSource(episode.url, function(source) {
                    tasks[uuid].episodes[i].source = source;
                    i += 1;
                    tasks[uuid].status = i;
                    updatePopup();
                    if (i < episodes.length) {
                        setTimeout(next, timespan * 1000);
                    }else{
                        createEpub(tasks[uuid], function(content){
                            download(`${author}『${title}』.epub`, content);
                            delete tasks[uuid];
                        });
                    }
                });
            }
        }
        next();

    });
}

chrome.extension.onConnect.addListener(function(port) {
    ports.push(port);
    port.onDisconnect.addListener(function() {
        ports.splice(ports.indexOf(port), 1);
    });
    updatePopup();
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (tab.url.match(/^https:\/\/kakuyomu\.jp\/works\/\d{19}$/)) {
        chrome.pageAction.show(tabId);
    }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch (request.command) {
        case "text":
            downloadAsText(request.id);
            sendResponse();
            break;
        case "epub":
            downloadAsEpub(request.id);
            sendResponse();
            break;
        case "cancel":
            delete tasks[request.uuid];
            updatePopup();
            sendResponse();
            break;
        case "pageviewEnabled":
            pageview = true;
            break;
        case "pageviewDisabled":
            pageview = false;
            break;
        default:
            console.log("ERROR: Unknown command: " + JSON.stringify(request));
            break;
    }
});
