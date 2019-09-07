/* This file is part of Ezra Project.

   Copyright (C) 2019 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file COPYING.
   If not, see <http://www.gnu.org/licenses/>. */

class Tab {
  constructor(defaultBibleTranslationId) {
    this.elementId = null;
    this.book = null;
    this.bookTitle = null;
    this.tagIdList = "";
    this.tagTitleList = "";
    this.searchTerm = null;
    this.searchResults = null;
    this.textIsBook = false;
    this.textType = null;
    this.lastHighlightedNavElementIndex = null;
    this.bibleTranslationId = defaultBibleTranslationId;
  }

  getTitle() {
    var tabTitle = "";

    if (this.textType == 'book') {
      tabTitle = this.bookTitle;
    } else if (this.textType == 'tagged_verses') {
      tabTitle = this.tagTitleList;
    } else if (this.textType == 'search_results') {
      tabTitle = this.getSearchTabTitle(this.searchTerm);
    }

    return tabTitle;
  }

  getSearchTabTitle(searchTerm) {
    return i18n.t("verse-list-menu.search") + ": " + searchTerm;
  }
}

Tab.fromJsonObject = function(jsonObject) {
  tab = new Tab();
  Object.assign(tab, jsonObject);
  return tab;
}

module.exports = Tab;