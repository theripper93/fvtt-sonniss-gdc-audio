import { MODULE_ID } from "../main.js";
import { HandlebarsApplication, l } from "../lib/utils.js";
import {getSetting, setSetting} from "../settings.js";

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
        setSetting("inFolder", { ...getSetting("inFolder"), [filename]: url});
        //first get the file as a blob
        const response = await fetch(url);
        const blob = await response.blob();
        //then create a file object
        const file = new File([blob], filename);
        //finally copy the file to the destination folder
        const [source, dir] = new FilePicker()._inferCurrentDirectory(destination);
        await FilePicker.upload(source, dir, file);
    }

    async copyClipboard(event) {
        game.clipboard.copyPlainText(event.target.dataset.path);
        ui.notifications.info("Path copied to clipboard.");
    }

    async playSound(event) {
        const src = event.target.dataset.path;
        if (audioHelperSounds[src]) return;
        const sound = await foundry.audio.AudioHelper.play({src, loop: false});
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

    async prepareMetadata() {
        if (__metadata) return __metadata;
        __metadata = await foundry.utils.fetchJsonWithTimeout(`modules/${MODULE_ID}/assets/meta.json`);
        __metadata = __metadata.map((m) => {
            const nameNoExtension = m.name.split(".")[0];
            return {
                search: nameNoExtension.split("-"),
                displayName: nameNoExtension.replaceAll("-", " "),
                filename: m.name,
                url: `modules/${MODULE_ID}/assets/audio/${m.name}`,
            };
        });
        __metadata = __metadata.sort((a, b) => a.search.join().localeCompare(b.search.join()));
        return __metadata;
    }

    async _prepareContext(options) {
        const metadata = await this.prepareMetadata();
        const filtered = this.filterSearch(metadata);
        return { sounds: filtered, search: SEARCH };
    }

    _onRender(context, options) {
        super._onRender(context, options);
        const html = this.element;
        this._updateFrame({window: {title: this.title}});
        //set drag data on li elements
        if (options.parts.includes("list")) {
            html.querySelectorAll("li").forEach((li) => {
                li.addEventListener("dragstart", (e) => {
                    const folder = getSetting("folder");
                    const autoCopy = getSetting("autoCopy") && folder;
                    const inFolder = getSetting("inFolder")[e.target.dataset.url.split("/").pop()];
                    if(autoCopy) this.copyFile(e);
                    e.dataTransfer.setData(
                        "text/plain",
                        JSON.stringify({
                            type: "PlaylistSound",
                            data: {
                                path: autoCopy || inFolder ? folder + "/" + e.target.dataset.url.split("/").pop() : e.target.dataset.url,
                                name: e.target.dataset.displayName,
                            },
                        }),
                    );
                });
                li.querySelectorAll("button").forEach((button) => {
                    button.addEventListener("click", this[button.dataset.action].bind(this));
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
                button.addEventListener("click", this[button.dataset.action].bind(this));
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
            if(results.length >= MAX_RESULTS) break;
        }
        return results;
    }

    renderDebounced() {
        this.render({parts: ["list"]});
    }

    _onClose(options) {
        super._onClose(options);
    }
}
