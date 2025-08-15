import { MODULE_ID } from "../main.js";
import { HandlebarsApplication, l } from "../lib/utils.js";
import { getSetting, setSetting } from "../settings.js";

let __metadata;

let SEARCH = "";

let audioHelperSounds = {};

export class SoundBrowser extends HandlebarsApplication {
    constructor() {
        super();
        this.renderDebounced = foundry.utils.debounce(this.renderDebounced, 100);
    }

    static get MAX_RESULTS() {
        return 1000;
    }

    static get DEFAULT_OPTIONS() {
        return {
            classes: [this.APP_ID],
            tag: "div",
            window: {
                frame: true,
                positioned: true,
                title: `${MODULE_ID}.${this.APP_ID}.title`,
                icon: "fa-duotone fa-record-vinyl",
                controls: [],
                minimizable: true,
                resizable: true,
                contentTag: "section",
                contentClasses: [],
            },
            actions: {
            },
            form: {
                handler: undefined,
                submitOnChange: false,
                closeOnSubmit: false,
            },
            position: {
                width: 560,
                height: "auto",
            },
        };
    }

    static get PARTS() {
        return {
            content: {
                template: `modules/${MODULE_ID}/templates/${this.APP_ID}.hbs`,
                classes: ["standard-form"],
            },
            list: {
                template: `modules/${MODULE_ID}/templates/list.hbs`,
                classes: ["standard-form"],
            },
        };
    }

    static get APP_ID() {
        return this.name
            .split(/(?=[A-Z])/)
            .join("-")
            .toLowerCase();
    }

    get APP_ID() {
        return this.constructor.APP_ID;
    }

    get title() {
        const baseTitle = l(`${MODULE_ID}.${this.APP_ID}.title`);
        return baseTitle + ` - ${__metadata?.length} sounds - max results: ${this.constructor.MAX_RESULTS}`;
    }

    async copyFile(event) {
        const destination = getSetting("folder");
        if (!destination) return ui.notifications.error("No folder set.");
        const url = event.target.dataset.path ?? event.target.dataset.url;
        const filename = url.split("/").pop();
        const newFileName = (__metadata.find((e) => e.url === url)?.displayName).slugify({ strict: true }) + ".ogg";
        //first get the file as a blob
        const response = await fetch(url);
        const blob = await response.blob();
        //then create a file object
        const file = new File([blob], newFileName);
        //finally copy the file to the destination folder
        const fp = new foundry.applications.apps.FilePicker({ current: destination });
        const source = fp.activeSource;
        const dir = fp.source.target;
        const res = await foundry.applications.apps.FilePicker.upload(source, dir, file);
        const customMetadata = getSetting("customMetadata");
        customMetadata[filename] ??= {};
        customMetadata[filename].customUrl = res.path;
        setSetting("customMetadata", customMetadata);
    }

    async copyClipboard(event) {
        game.clipboard.copyPlainText(event.target.dataset.path);
        ui.notifications.info("Path copied to clipboard.");
    }

    async playSound(event) {
        const src = event.target.dataset.path;
        if (audioHelperSounds[src]) return;
        const sound = await foundry.audio.AudioHelper.play({ src, loop: false });
        audioHelperSounds[src] = sound;
    }

    async stopSound(event) {
        const src = event.target.dataset.path;
        const sound = audioHelperSounds[src];
        if (sound) sound.stop();
        delete audioHelperSounds[src];
    }

    async stopAll(event) {
        for (const sound in audioHelperSounds) {
            const s = audioHelperSounds[sound];
            if (s) s.stop();
        }
        audioHelperSounds = {};
    }

    async toggleFavorite(event) {
        const customMetadata = getSetting("customMetadata");
        const filename = event.currentTarget.dataset.path.split("/").pop();
        customMetadata[filename] ??= {};
        customMetadata[filename].favorite = !customMetadata[filename].favorite;
        event.currentTarget.classList.toggle("active");
        setSetting("customMetadata", customMetadata);
    }

    async prepareMetadata() {
        if (__metadata) return __metadata;
        const secondsToMMSS = (seconds) => {
            seconds = Math.round(seconds);
            const minutes = Math.floor(seconds / 60);
            const secondsLeft = seconds % 60;
            return `${minutes}:${secondsLeft < 10 ? "0" : ""}${secondsLeft}`;
        };
        __metadata = await foundry.utils.fetchJsonWithTimeout(`modules/${MODULE_ID}/assets/meta.json`);
        __metadata = __metadata.map((m) => {
            const nameNoExtension = m.name.split(".")[0];
            return {
                search: nameNoExtension.split("-"),
                displayName: nameNoExtension.replaceAll("-", " "),
                filename: m.name,
                url: `modules/${MODULE_ID}/assets/audio/${m.name}`,
                duration: secondsToMMSS(m.duration),
            };
        });
        SoundBrowser.mergeMetadata();
        return __metadata;
    }

    static mergeMetadata() {
        const customMetadata = getSetting("customMetadata");
        __metadata = __metadata.map((m) => {
            const custom = customMetadata[m.filename];
            if (custom) return { ...m, ...custom };
            return m;
        });
        __metadata = __metadata.sort((a, b) => a.displayName.localeCompare(b.displayName)).sort((a, b) => a.favorite ? -1 : b.favorite ? 1 : 0)
        return __metadata;
    }

    async _prepareContext(options) {
        const metadata = await this.prepareMetadata();
        const filtered = this.filterSearch(metadata);
        return { sounds: filtered, search: SEARCH, folder: getSetting("folder") };
    }

    _onRender(context, options) {
        super._onRender(context, options);
        const html = this.element;
        this._updateFrame({ window: { title: this.title } });
        //set drag data on li elements
        if (options.parts.includes("list")) {
            html.querySelectorAll("li").forEach((li) => {
                li.addEventListener("dragstart", (e) => {
                    const url = li.dataset.url;
                    const displayName = li.dataset.displayName;
                    const folder = getSetting("folder");
                    const autoCopy = getSetting("autoCopy") && folder;
                    const inFolder = getSetting("customMetadata")[url.split("/").pop()]?.customUrl;
                    if (autoCopy && !inFolder) this.copyFile(e);
                    const customPath = inFolder || (folder + "/" + ((__metadata.find((e) => e.url === url)?.displayName).slugify({ strict: true }) + ".ogg"))
                    e.dataTransfer.setData(
                        "text/plain",
                        JSON.stringify({
                            type: "PlaylistSound",
                            data: {
                                path: autoCopy || inFolder ? customPath : url,
                                name: displayName,
                            },
                        }),
                    );
                });
                li.querySelectorAll("button").forEach((button) => {
                    button.addEventListener("click", this[button.dataset.action].bind(this));
                });
                li.querySelector("input").addEventListener("change", (e) => {
                    const filename = li.dataset.url.split("/").pop();
                    const customMetadata = getSetting("customMetadata");
                    customMetadata[filename] ??= {};
                    customMetadata[filename].displayName = e.target.value;
                    setSetting("customMetadata", customMetadata);
                });
                //select all text on input focus
                li.querySelector("input").addEventListener("focus", (e) => {
                    e.target.select();
                });
            });
        }

        if (options.parts.includes("content")) {
            const content = html.querySelector(`[data-application-part="content"]`);
            const search = content.querySelector("input[name=search]");
            search.addEventListener("input", (e) => {
                SEARCH = e.target.value;
                this.renderDebounced();
            });
            content.querySelectorAll("button").forEach((button) => {
                if (button.dataset.action) button.addEventListener("click", this[button.dataset.action].bind(this));
            });
            const folder = content.querySelector("#folder");
            folder.addEventListener("change", (e) => {
                setSetting("folder", e.target.value);
            });
        }
    }

    filterSearch(metadata) {
        const MAX_RESULTS = this.constructor.MAX_RESULTS;
        const term = SEARCH.toLowerCase().split(" ");
        const results = [];
        for (const m of metadata) {
            const include = term.every((term) => m.search.some((s) => s.includes(term)));
            if (include) results.push(m);
            if (results.length >= MAX_RESULTS) break;
        }
        return results;
    }

    renderDebounced() {
        this.render({ parts: ["list"] });
    }

    _onClose(options) {
        super._onClose(options);
    }
}
