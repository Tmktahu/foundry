// Music Streamer
// @author Fryke#0746
// @version 1.0.0

class MusicStreamer extends Application{
  static ID = 'music-streamer';

  constructor(options) {
    super(options);

    this.streamURL = game.user.getFlag("music-streamer", "streamURL") || null;
    this.audio = new Audio(this.streamURL);
    this.audio.autoplay = true;
  }

  /* -------------------------------------------- */

  /** @override */
	static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
        id: "music-streamer-window",
        template: "./modules/music-streamer/templates/music-streamer.html",
        popOut: false
    });
  }

  activateListeners(html) {
    super.activateListeners(html);

    game.socket.on('module.music-streamer', (message) => {
      this.streamURL = message;
      game.user.setFlag("music-streamer", "streamURL", this.streamURL);
      document.getElementById('musicstreamer-url-input').value = this.streamURL;
      document.getElementById('musicstreamer-settings').classList.remove('open');
      this.play();
    })

    document.getElementById('musicstreamer-url-input').value = this.streamURL;

    let volumeSlider = document.querySelector("#musicstreamer-volume-control");
      volumeSlider.addEventListener("change", function(e) {
      window.MusicStreamer.audio.volume = e.currentTarget.value / 100;
    })

    html.find('#musicstreamer-move-handle').mousedown(ev => {
        ev.preventDefault();
        ev = ev || window.event;
        let isRightMB = false;
        if ("which" in ev) { // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
            isRightMB = ev.which == 3;
        } else if ("button" in ev) { // IE, Opera 
            isRightMB = ev.button == 2;
        }

        if (!isRightMB) {
            let deltaX = 0, deltaY = 0, startX = 0, startY = 0;
            dragElement(document.getElementById("music-streamer"));

            function dragElement(element) {
              element.onmousedown = dragMouseDown;
                function dragMouseDown(e) {
                    e = e || window.event;
                    e.preventDefault();
                    startX = e.clientX;
                    startY = e.clientY;

                    if (element.style.bottom != undefined) {
                      element.style.top = element.offsetTop + "px";
                      element.style.bottom = null;
                    }

                    document.onmouseup = closeDragElement;
                    document.onmousemove = elementDrag;
                }

                function elementDrag(e) {
                    e = e || window.event;
                    e.preventDefault();
                    // calculate the new cursor position:
                    deltaX = startX - e.clientX;
                    deltaY = startY - e.clientY;
                    startX = e.clientX;
                    startY = e.clientY;
                    // set the element's new position:
                    element.style.bottom = null;
                    element.style.right = null
                    element.style.top = (element.offsetTop - deltaY) + "px";
                    element.style.left = (element.offsetLeft - deltaX) + "px";
                    element.style.position = 'fixed';
                    element.style.zIndex = 100;
                }

                function closeDragElement() {
                    // stop moving when mouse button is released:
                    element.onmousedown = null;
                    element.style.zIndex = null;
                    document.onmouseup = null;
                    document.onmousemove = null;

                    let xPos = Math.clamped((element.offsetLeft - deltaX), 0, window.innerWidth - 200);
                    let yPos = Math.clamped((element.offsetTop - deltaY), 0, window.innerHeight - 20);

                    let position = { top: null, bottom: null, left: null, right: null };
                    position.top = yPos + 1;
                    position.left = xPos + 1;

                    element.style.top = (position.top ? position.top + "px" : null);
                    element.style.left = (position.left ? position.left + "px" : null);

                    //log(`Setting music-streamer position:`, position);
                    game.user.setFlag('music-streamer', 'position', position);
                    this.pos = position;
                }
            }
        }
    });
  }

  /** @override */
  getData(options) {
    let pos = this.getPos();
    return {
        pos: pos,
    };
  }

  getPos() {
    this.pos = game.user.getFlag("music-streamer", "position");

    if (this.pos == undefined) {
        let hbpos = $('#hotbar').position();
        let width = $('#hotbar').width();
        this.pos = { left: hbpos.left + width + 4, right: '', top: 10, bottom: '' };
        game.user?.setFlag("music-streamer", "position", this.pos);
    }

    let result = '';
    if (this.pos != undefined) {
        result = Object.entries(this.pos).filter(k => {
            return k[1] != null;
        }).map(k => {
            return k[0] + ":" + k[1] + 'px';
        }).join('; ');
    }

    return result;
  }

  setPos() {
      this.pos = game.user.getFlag("music-streamer", "position");

      if (this.pos == undefined) {
          let hbpos = $('#hotbar').position();
          let width = $('#hotbar').width();
          this.pos = { left: hbpos.left + width + 4, right: '', top: '', bottom: 10 };
          game.user.setFlag("music-streamer", "position", this.pos);
      }

      log('Setting position', this.pos, this.element);
      $(this.element).css(this.pos);

      return this;
  }

  toggleSettings() {
    document.getElementById('musicstreamer-settings').classList.toggle('open');
  }

  setSrc() {
    let newURL = document.getElementById('musicstreamer-url-input').value;
    if(game.user.isGM) {
      game.socket.emit('module.music-streamer', newURL);
    }

    this.streamURL = newURL;
    game.user.setFlag("music-streamer", "streamURL", this.streamURL);
    document.getElementById('musicstreamer-settings').classList.remove('open');
    this.play();
  }

  stop() {
    this.audio.pause();
    this.audio.src = "about:blank";
    this.audio.load();
  }

  play() {
    if(this.streamURL) {
      this.audio.src = this.streamURL;
    }
    this.audio.load();
    this.audio.play();
  }
}

Hooks.on("ready", () => {
  let musicStreamer = new MusicStreamer();
  window.MusicStreamer = musicStreamer;
  musicStreamer.render(true);
});