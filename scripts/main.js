import {SoundBrowser} from "./app/app.js";
import {initConfig} from "./config.js";
import { registerSettings } from "./settings.js";

export const MODULE_ID = "fvtt-sonniss-gdc-audio";

Hooks.on("init", () => {
    initConfig();
    registerSettings();

    Hooks.on("renderSidebarTab", (app, html) => {
        if (!(app instanceof PlaylistDirectory)) return;
        const buttonContainer = html[0].querySelector(".header-actions.action-buttons");
        const button = document.createElement("button");
        button.innerHTML = `<i class="fa-duotone fa-record-vinyl"></i> ${game.i18n.localize(`${MODULE_ID}.sidebarButtonText`)}`;
        button.onclick = async (e) => {
            new SoundBrowser().render(true);

        };
        buttonContainer.appendChild(button);
    });

});

Hooks.on("ready", () => {
    new SoundBrowser().render(true);
});