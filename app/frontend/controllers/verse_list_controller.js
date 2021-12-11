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

const VerseBox = require('../ui_models/verse_box.js');
const { getPlatform } = require('../helpers/ezra_helper.js');
const wheelnavController = require('../controllers/wheelnav_controller.js');
const eventController = require('../controllers/event_controller.js');


/**
 * This controller provides an API for the verse list as well as event handlers for clicks within the verse list.
 * @module verseListController
 * @category Controller
 */

function init() {
  eventController.subscribe('on-bible-text-loaded', (tabIndex) => { bindEventsAfterBibleTextLoaded(tabIndex); });
  eventController.subscribe('on-all-translations-removed', async () => { onAllTranslationsRemoved(); });
}

function getCurrentVerseListFrame(tabIndex=undefined) {
  var currentVerseListTabs = app_controller.getCurrentVerseListTabs(tabIndex);
  var currentVerseListFrame = currentVerseListTabs.find('.verse-list-frame');
  return currentVerseListFrame;
}

function getCurrentVerseList(tabIndex=undefined) {
  var currentVerseListFrame = getCurrentVerseListFrame(tabIndex);
  var verseList = currentVerseListFrame[0].querySelector('.verse-list');
  return $(verseList);
}

function getCurrentVerseListHeader(tabIndex=undefined) {
  var currentVerseListFrame = getCurrentVerseListFrame(tabIndex);
  var verseListHeader = currentVerseListFrame.find('.verse-list-header');
  return verseListHeader;
}

function getCurrentSearchProgressBar(tabIndex=undefined) {
  var currentVerseListFrame = getCurrentVerseListFrame(tabIndex);
  var searchProgressBar = currentVerseListFrame.find('.search-progress-bar');
  return searchProgressBar;
}

function getCurrentSearchCancelButtonContainer(tabIndex=undefined) {
  var currentVerseListFrame = getCurrentVerseListFrame(tabIndex);
  var searchCancelButton = currentVerseListFrame.find('.cancel-module-search-button-container');
  return searchCancelButton;
}

function hideSearchProgressBar(tabIndex=undefined) {
  var searchProgressBar = getCurrentSearchProgressBar(tabIndex);
  searchProgressBar.hide();

  var cancelSearchButtonContainer = getCurrentSearchCancelButtonContainer(tabIndex);
  cancelSearchButtonContainer.hide();
}

function getCurrentVerseListLoadingIndicator(tabIndex=undefined) {
  var currentVerseListFrame = getCurrentVerseListFrame(tabIndex);
  var loadingIndicator = currentVerseListFrame.find('.verse-list-loading-indicator');
  return loadingIndicator;
}

function showVerseListLoadingIndicator(tabIndex=undefined, message=undefined, withLoader=true) {
  var loadingIndicator = getCurrentVerseListLoadingIndicator(tabIndex);
  var loadingText = loadingIndicator.find('.verse-list-loading-indicator-text');
  if (message === undefined) {
    message = i18n.t("bible-browser.loading-bible-text");
  }

  loadingText.html(message);

  if (withLoader) {
    loadingIndicator.find('.loader').show();
  } else {
    loadingIndicator.find('.loader').hide();
  }

  loadingIndicator.show();
}

function hideVerseListLoadingIndicator(tabIndex=undefined) {
  var loadingIndicator = getCurrentVerseListLoadingIndicator(tabIndex);
  loadingIndicator.hide();
}

function getBibleBookStatsFromVerseList(tabIndex) {
  var bibleBookStats = {};    
  var currentVerseList = getCurrentVerseList(tabIndex)[0];
  var verseBoxList = currentVerseList.querySelectorAll('.verse-box');

  for (var i = 0; i < verseBoxList.length; i++) {
    var currentVerseBox = verseBoxList[i];
    var bibleBookShortTitle = new VerseBox(currentVerseBox).getBibleBookShortTitle();

    if (bibleBookStats[bibleBookShortTitle] === undefined) {
      bibleBookStats[bibleBookShortTitle] = 1;
    } else {
      bibleBookStats[bibleBookShortTitle] += 1;
    }
  }

  return bibleBookStats;
}

function getFirstVisibleVerseAnchor() {
  let verseListFrame = getCurrentVerseListFrame();
  let firstVisibleVerseAnchor = null;

  if (verseListFrame != null && verseListFrame.length > 0) {
    let verseListFrameRect = verseListFrame[0].getBoundingClientRect();

    let currentNavigationPane = app_controller.navigation_pane.getCurrentNavigationPane()[0];
    let currentNavigationPaneWidth = currentNavigationPane.offsetWidth;

    // We need to a add a few pixels to the coordinates of the verseListFrame so that we actually hit an element within the verseListFrame
    const VERSE_LIST_CHILD_ELEMENT_OFFSET = 15;
    let firstElementOffsetX = verseListFrameRect.x + currentNavigationPaneWidth + VERSE_LIST_CHILD_ELEMENT_OFFSET;
    let firstElementOffsetY = verseListFrameRect.y + VERSE_LIST_CHILD_ELEMENT_OFFSET;
    
    let currentElement = document.elementFromPoint(firstElementOffsetX, firstElementOffsetY);

    if (currentElement != null && currentElement.classList != null && currentElement.classList.contains('verse-list')) {
      // If the current element is the verse-list then we try once more 10 pixels lower.
      currentElement = document.elementFromPoint(firstElementOffsetX, firstElementOffsetY + 10);
    }

    if (currentElement == null) {
      return null;
    }

    if (currentElement.classList != null && 
        (currentElement.classList.contains('sword-section-title') ||
          currentElement.classList.contains('tag-browser-verselist-book-header'))) {
      // We are dealing with a section header element (either sword-section-title or tag-browser-verselist-book-header)

      if (currentElement.previousElementSibling != null &&
          currentElement.previousElementSibling.nodeName == 'A') {

        currentElement = currentElement.previousElementSibling;
      }
    } else {
      // We are dealing with an element inside a verse-box
      const MAX_ELEMENT_NESTING = 7;

      // Traverse up the DOM to find the verse-box
      for (let i = 0; i < MAX_ELEMENT_NESTING; i++) {
        if (currentElement == null) {
          break;
        }

        if (currentElement.classList != null && currentElement.classList.contains('verse-box')) {

          // We have gotten a verse-box ... now get the a.nav element inside it!
          currentElement = currentElement.querySelector('a.nav');

          // Leave the loop since we found the anchor!
          break;

        } else {
          // Proceed with the next parentNode
          currentElement = currentElement.parentNode;
        }
      }
    }

    if (currentElement != null && currentElement.nodeName == 'A') {
      firstVisibleVerseAnchor = currentElement.name;
    }
  }

  return firstVisibleVerseAnchor;
}

function resetVerseListView() {
  var textType = app_controller.tab_controller.getTab().getTextType();
  if (textType != 'xrefs' && textType != 'tagged_verses') {
    var currentReferenceVerse = getCurrentVerseListFrame().find('.reference-verse');
    currentReferenceVerse[0].innerHTML = "";
  }

  var currentVerseList = getCurrentVerseList()[0];
  if (currentVerseList != undefined) {
    currentVerseList.innerHTML = "";
  }

  app_controller.docxExport.disableExportButton();
}

function getVerseListBookNumber(bibleBookLongTitle, bookHeaders=undefined) {
  var bibleBookNumber = -1;

  if (bookHeaders === undefined) {
    var currentVerseListFrame = getCurrentVerseListFrame();
    bookHeaders = currentVerseListFrame.find('.tag-browser-verselist-book-header');
  }

  for (let i = 0; i < bookHeaders.length; i++) {
    var currentBookHeader = $(bookHeaders[i]);
    var currentBookHeaderText = currentBookHeader.text();

    if (currentBookHeaderText.includes(bibleBookLongTitle)) {
      bibleBookNumber = i + 1;
      break;
    }
  }

  return bibleBookNumber;
}

function bindEventsAfterBibleTextLoaded(tabIndex=undefined, preventDoubleBinding=false, verseList=undefined) {
  if (verseList == undefined) {
    verseList = getCurrentVerseList(tabIndex);
  }

  var tagBoxes = verseList.find('.tag-box');
  var tags = verseList.find('.tag');
  var xref_markers = verseList.find('.sword-xref-marker');

  if (preventDoubleBinding) {
    tagBoxes = tagBoxes.filter(":not('.tag-events-configured')");
    tags = tags.filter(":not('.tag-events-configured')");
    xref_markers = xref_markers.filter(":not('.events-configured')");
  }

  tagBoxes.bind('mousedown', tags_controller.clear_verse_selection).addClass('tag-events-configured');

  tags.bind('mousedown', async (event) => {
    event.stopPropagation();
    await handleReferenceClick(event);
  }).addClass('tag-events-configured');

  xref_markers.bind('mousedown', async (event) => {
    event.stopPropagation();
    await handleReferenceClick(event);
  }).addClass('events-configured');

  verseList.find('.verse-box').bind('mouseover', (e) => { onVerseBoxMouseOver(e); });

  if (platformHelper.isElectron()) {
    // FIXME: Get rid of this function
    app_controller.verse_context_controller.init_verse_expand_box(tabIndex);
  }

  if (getPlatform().isFullScreen()) {
    wheelnavController.bindEvents();
  }
}
  
function bindXrefEvents(tabIndex=undefined) {
  var verseList = getCurrentVerseList(tabIndex);
  var xref_markers = verseList.find('.sword-xref-marker');

  xref_markers.unbind();
  
  xref_markers.bind('mousedown', async (event) => {
    await handleReferenceClick(event);
  }).addClass('events-configured');
}

function onVerseBoxMouseOver(event) {
  var focussedElement = event.target;
  app_controller.navigation_pane.updateNavigationFromVerseBox(focussedElement);
}

async function handleReferenceClick(event) {
  var currentTab = app_controller.tab_controller.getTab();
  var currentTextType = currentTab.getTextType();
  var verseBox = $(event.target).closest('.verse-box');
  var isReferenceVerse = verseBox.parent().hasClass('reference-verse');
  var isXrefMarker = event.target.classList.contains('sword-xref-marker');
  var isTag = event.target.classList.contains('tag');

  if (isReferenceVerse &&
    ((currentTextType == 'xrefs') || (currentTextType == 'tagged_verses'))
  ) {
    if (isXrefMarker) {
      await app_controller.verse_list_popup.initCurrentXrefs(event.target);

      app_controller.openXrefVerses(this.verse_list_popup.currentReferenceVerseBox,
                                    this.verse_list_popup.currentPopupTitle,
                                    this.verse_list_popup.currentXrefs);

    } else if (isTag) {

      app_controller.verse_list_popup.initCurrentTag(event.target);

      app_controller.openTaggedVerses(this.verse_list_popup.currentTagId,
                                      this.verse_list_popup.currentTagTitle,
                                      this.verse_list_popup.currentReferenceVerseBox);

    }
  } else {
    if (isXrefMarker) {
      let referenceType = "XREFS";

      if (app_controller.optionsMenu._verseListNewTabOption.isChecked &&
          !getPlatform().isFullScreen()) { // No tabs available in fullscreen!
        
        app_controller.verse_list_popup.currentReferenceType = referenceType;
        await app_controller.verse_list_popup.initCurrentXrefs(event.target);
        app_controller.verse_list_popup.openVerseListInNewTab();
      } else {
        await app_controller.verse_list_popup.openVerseListPopup(event, referenceType);
      }
    } else if (isTag) {
      let referenceType = "TAGGED_VERSES";

      if (app_controller.optionsMenu._verseListNewTabOption.isChecked &&
          !getPlatform().isFullScreen()) { // No tabs available in fullscreen!
        
        app_controller.verse_list_popup.currentReferenceType = referenceType;
        app_controller.verse_list_popup.initCurrentTag(event.target);
        app_controller.verse_list_popup.openVerseListInNewTab();
      } else {
        await app_controller.verse_list_popup.openVerseListPopup(event, referenceType);
      }
    }
  }
}

// Re-init application to state without Bible translations
function onAllTranslationsRemoved() {
  resetVerseListView();
  hideVerseListLoadingIndicator();
  getCurrentVerseList().append("<div class='help-text'>" + i18n.t("help.help-text-no-translations") + "</div>");
  $('.book-select-value').text(i18n.t("menu.book"));
}

module.exports = {
  init,
  getCurrentVerseListHeader,
  getCurrentVerseListFrame,
  getCurrentVerseList,
  getCurrentSearchProgressBar,
  getCurrentSearchCancelButtonContainer,
  hideSearchProgressBar,
  getCurrentVerseListLoadingIndicator,
  showVerseListLoadingIndicator,
  hideVerseListLoadingIndicator,
  getBibleBookStatsFromVerseList,
  getFirstVisibleVerseAnchor,
  resetVerseListView,
  getVerseListBookNumber,
  bindEventsAfterBibleTextLoaded,
  bindXrefEvents,
  handleReferenceClick
};