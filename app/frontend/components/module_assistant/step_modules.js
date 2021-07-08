/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */


const { html } = require('../../helpers/ezra_helper.js');
const assistantController = require('./assistant_controller.js');
const i18nHelper = require('../../helpers/i18n_helper.js');
const assistantHelper = require('./assistant_helper.js');
require('../loading_indicator.js');


const ICON_LOCKED = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!-- Font Awesome Free 5.15.3 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) --><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z"/></svg>';

const ICON_INFO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!-- Font Awesome Free 5.15.3 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) --><path d="M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z"/></svg>`;

const template = html`
<style>
  #module-step-wrapper {
    display: flex;
    height: 100%;
    border-radius: 5px;
    overflow: hidden;
  }
  #module-list {
    overflow-y: auto;
    width: 100%;
    padding-right: 1em;
  }
  .feature-filter-wrapper {
    margin-bottom: 1em;
    display: none;
  }
  #module-list > p:first-child {
    margin-top: 0;
  }
  #module-list-intro {
    clear: both; 
    margin-bottom: 2em;
  }

  #module-info {
    overflow-y: auto;
    display: block;
    padding: 1em;
    position: relative;
    z-index: 10;
    color: #696969;
    width: 100%;
  }
  .darkmode--activated #module-info, .darkmode--activated #module-info p {
    color: #929292;
  }
  #module-info .background {
    position: absolute;
    z-index: -1;
    width: 17em;
    margin-top: -4em;
    margin-left: -4em;
    opacity: 0.1;
    fill: #696969;
  }
</style>

<div id="module-step-wrapper">
  <div id="module-list" class="scrollable">
    <p id="module-list-intro" class="intro" i18n="module-assistant.pick-module-info"></p>
    
    <p><b i18n="module-assistant.module-display-preferences"></b></p>

    <div id="bible-module-feature-filter" class="feature-filter-wrapper">
      <label>
        <input id="headings-feature-filter" class="module-feature-filter" type="checkbox"/> 
        <span id="headings-feature-filter-label" for="headings-feature-filter" i18n="$t(module-assistant.module-with) $t(general.module-headings)"></span>
      </label>
      <label>
        <input id="strongs-feature-filter" class="module-feature-filter" type="checkbox"/>
        <span id="strongs-feature-filter-label" for="strongs-feature-filter" i18n="$t(module-assistant.module-with) $t(general.module-strongs)"></span>
      </label>
    </div>

    <div id="dict-module-feature-filter" class="feature-filter-wrapper">
      <label>
        <input id="hebrew-strongs-dict-feature-filter" class="module-feature-filter" type="checkbox"/>
        <span id="hebrew-strongs-dict-feature-filter-label" for="hebrew-strongs-dict-feature-filter" i18n="$t(module-assistant.module-with) $t(general.module-hebrew-strongs-dict)"></span>
      </label>
      <label>
        <input id="greek-strongs-dict-feature-filter" class="module-feature-filter" type="checkbox"/>
        <span id="greek-strongs-dict-feature-filter-label" for="greek-strongs-dict-feature-filter" i18n="$t(module-assistant.module-with) $t(general.module-greek-strongs-dict)"></span>
      </label>
    </div>


    <div id="filtered-module-list"></div>
  </div>  

  <div id="module-info" class="scrollable">
    <div class="background">${ICON_INFO}</div>
    <div id="module-info-content" i18n="module-assistant.click-to-show-detailed-module-info"></div>
    <loading-indicator style="display: none"></loading-indicator>
  </div>
</div>
`;

/**
 * @module StepModules
 * component displays available for installation modules from selected repositories and languages
 * @example
 * <step-modules></step-modules>
 * @category Component
 */
class StepModules extends HTMLElement {

  constructor() {
    super();
    console.log('MODULES: step constructor');

    /** @type {import('./unlock_dialog')} */
    this.unlockDialog = null;
  }

  async connectedCallback() {
    console.log('MODULES: started connectedCallback');
    this.appendChild(template.content.cloneNode(true));
    assistantHelper.localize(this, assistantController.get('moduleTypeText'));
    
    this.querySelectorAll('.module-feature-filter').forEach(checkbox => checkbox.addEventListener('click', async () => {
      this._listFilteredModules();
    }));
    
    const filteredModuleList = this.querySelector('#filtered-module-list');
    filteredModuleList.addEventListener('itemChanged', (e) => this._handleCheckboxClick(e));
    filteredModuleList.addEventListener('itemInfoRequested', (e) => this._handleInfoClick(e));
  }
  
  async listModules() {
    console.log('MODULES: listModules');

    const moduleType = assistantController.get('moduleType');
    if (moduleType == 'BIBLE') {
      this.querySelector("#bible-module-feature-filter").style.display = 'block';
    } else if (moduleType == 'DICT') {
      this.querySelector("#dict-module-feature-filter").style.display = 'block';
    }

    await this._listFilteredModules();
  }

  async _listFilteredModules() {
    console.log('MODULES: listFilteredModules');

    const filteredModuleList = this.querySelector('#filtered-module-list');
    filteredModuleList.innerHTML = '';

    const headingsFilter = this.querySelector('#headings-feature-filter').checked;
    const strongsFilter = this.querySelector('#strongs-feature-filter').checked;

    const hebrewStrongsFilter = this.querySelector('#hebrew-strongs-dict-feature-filter').checked;
    const greekStrongsFilter = this.querySelector('#greek-strongs-dict-feature-filter').checked;

    const languageCodes = [...assistantController.get('selectedLanguages')].sort((codeA, codeB) => {
      return assistantHelper.sortByText(i18nHelper.getLanguageName(codeA), i18nHelper.getLanguageName(codeB));
    });

    let renderHeader = false;
    if (languageCodes.length > 1) {
      renderHeader = true;
    }

    const repositories = [...assistantController.get('selectedRepositories')];

    const sectionOptions = {columns: 1, 
                            disableSelected: true, 
                            rowGap: '1.5em', 
                            info: true, 
                            extraIndent: true};

    for (const language of languageCodes) {
      const modules = await getModulesByLang(language, repositories, headingsFilter, strongsFilter, hebrewStrongsFilter, greekStrongsFilter);

      const langModuleSection = assistantHelper.listCheckboxSection(modules,
                                                                    new Set(assistantController.get('installedModules')),
                                                                    renderHeader ? i18nHelper.getLanguageName(language) : undefined,
                                                                    sectionOptions);
      filteredModuleList.append(langModuleSection);
    }
  }

  _handleCheckboxClick(event) {
    const checkbox = event.target;
    const moduleId = event.detail.code;
    const checked = event.detail.checked;

    if (checked) {
      assistantController.add('selectedModules', moduleId);
    } else {
      assistantController.remove('selectedModules', moduleId);
    }

    if (!checkbox.hasAttribute('locked')) {
      return;
    }

    if (checked) {
      console.log('MODULE checkbox locked checked', event.detail, event.target);
      this.unlockDialog.show(moduleId, checkbox.getAttribute('unlock-info'), checkbox);
    } else {
      // Checkbox unchecked!
      // Reset the unlock key for this module
      this.unlockDialog.resetKey(moduleId);
    }
  }

  _handleInfoClick(event) {

    const moduleCode = event.detail.code;

    const moduleInfo = this.querySelector('#module-info');
    if (moduleInfo.getAttribute('code') !== moduleCode) {
      moduleInfo.setAttribute('code', moduleCode);

      const moduleInfoContent = moduleInfo.querySelector('#module-info-content');
      const loadingIndicator = moduleInfo.querySelector('loading-indicator');

      moduleInfoContent.innerHTML = '';
      loadingIndicator.show();

      setTimeout(async () => {
        const swordModuleHelper = require('../../helpers/sword_module_helper.js');
        moduleInfoContent.innerHTML = await swordModuleHelper.getModuleInfo(moduleCode, true);
        loadingIndicator.hide();
      }, 100);
    }  
  }

}

customElements.define('step-modules', StepModules);
module.exports = StepModules;

async function getModulesByLang(languageCode, repositories, headingsFilter, strongsFilter, hebrewStrongsFilter, greekStrongsFilter) {
  var currentLangModules = [];

  for (const currentRepo of repositories) {
    const currentRepoLangModules = await ipcNsi.getRepoModulesByLang(currentRepo,
                                                                     languageCode,
                                                                     assistantController.get('moduleType'),
                                                                     headingsFilter,
                                                                     strongsFilter,
                                                                     hebrewStrongsFilter,
                                                                     greekStrongsFilter);

    const modulesArr = currentRepoLangModules.map(swordModule => {
      let moduleInfo = {
        code: swordModule.name,
        text: `${swordModule.description} [${swordModule.name}]`,
        description: `${swordModule.repository}; ${i18n.t('general.module-version')}: ${swordModule.version}; ${i18n.t("general.module-size")}: ${Math.round(swordModule.size / 1024)} KB`,
      };

      if (swordModule.locked) {
        moduleInfo['icon'] = ICON_LOCKED;
        moduleInfo['title'] = i18n.t("module-assistant.module-lock-info");
        moduleInfo['locked'] = "locked";
        moduleInfo['unlock-info'] = swordModule.unlockInfo;
      }

      return moduleInfo;
    });

    // Append this repo's modules to the overall language list
    currentLangModules = currentLangModules.concat(modulesArr);
  }

  return currentLangModules.sort(assistantHelper.sortByText);
}