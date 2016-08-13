window.onload = function() {
    var tasks = {};

    var button = document.querySelector("button#text");
    button.addEventListener("click", function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs){
            var url = tabs[0].url;
            var id = url.slice("https://kakuyomu.jp/works/".length, url.length);
            chrome.runtime.sendMessage({ command: "text", id: id }, function(response) {
            });
        });
    });

    var epubButton = document.querySelector("button#epub");
    epubButton.addEventListener("click", function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs){
            var url = tabs[0].url;
            var id = url.slice("https://kakuyomu.jp/works/".length, url.length);
            chrome.runtime.sendMessage({ command: "epub", id: id }, function(response) {
            });
        });
    });

    var pageview = document.querySelector("input#pageview");
    pageview.addEventListener("change", function(){
        chrome.runtime.sendMessage({ command: pageview.checked ? "pageviewEnabled" : "pageviewDisabled" }, function(response) {
        });
    });

    var port = chrome.extension.connect({name: "Status Communication"});
    port.onMessage.addListener(function(msg) {
        var tasks = msg.tasks;
        var status = document.querySelector("div#status");
        status.innerHTML = "";
        var keys = Object.keys(tasks);
        for(var m = 0; m < keys.length; m++){
            var task = tasks[keys[m]];
            var div = document.createElement("div");
            div.textContent = task.title;
            if(task.status < task.length){
                var cancel = document.createElement("a");
                cancel.setAttribute("class", "cancel");
                cancel.setAttribute("href", "#");
                cancel.addEventListener("click", function(e){
                    chrome.runtime.sendMessage({ command: "cancel", uuid: task.uuid }, function(response) {
                    });
                    e.stopPropagation();
                    e.preventDefault();
                });
                cancel.textContent = "[中止]";

                div.textContent += `(${task.status} / ${task.length})`;
                div.appendChild(cancel);
            }
            status.appendChild(div);
        }


        pageview.checked = msg.pageview;
    });
};
