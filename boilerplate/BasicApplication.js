import { MODULE_ID } from "../main.js";
import { HandlebarsApplication } from "../lib/utils.js";

export class BasicApplication extends HandlebarsApplication {
    constructor() {
        super();
    }

    static DEFAULT_OPTIONS = {
        classes: [this.APP_ID],
        tag: "div",
        window: {
            frame: true,
            positioned: true,
            title: `${MODULE_ID}.${this.APP_ID}.title`,
            icon: "",
            controls: [],
            minimizable: true,
            resizable: false,
            contentTag: "section",
            contentClasses: [],
        },
        actions: {},
        form: {
            handler: undefined,
            submitOnChange: false,
            closeOnSubmit: false,
        },
        position: {
            width: 560,
            height: "auto",
        },
        actions: {},
    };

    static PARTS = {
        content: {
            template: `modules/${MODULE_ID}/templates/${this.APP_ID}.hbs`,
        },
    };

    static get APP_ID() {
        return this.name
            .split(/(?=[A-Z])/)
            .join("-")
            .toLowerCase();
    }

    get APP_ID() {
        return this.constructor.APP_ID;
    }

    async _prepareContext(options) {
        const data = {};
        return { data };
    }

    _onRender(context, options) {
        super._onRender(context, options);
        const html = this.element;
    }

    _onClose(options) {
        super._onClose(options);
    }
}