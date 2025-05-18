import {SoundBrowser} from "./app/app.js";
import {initConfig} from "./config.js";
import { registerSettings } from "./settings.js";

export const MODULE_ID = "fvtt-sonniss-gdc-audio";

Hooks.on("init", () => {
    initConfig();
    registerSettings();

    Hooks.on("renderPlaylistDirectory", (app, html) => {
        const buttonContainer = html.querySelector(".header-actions.action-buttons");
        const button = document.createElement("button");
        button.type = "button";
        button.innerHTML = `<i class="fa-duotone fa-record-vinyl"></i> <span>${game.i18n.localize(`${MODULE_ID}.sidebarButtonText`)}</span>`;
        button.onclick = async (e) => {
            new SoundBrowser().render(true);
        };
        buttonContainer.appendChild(button);
    });

});