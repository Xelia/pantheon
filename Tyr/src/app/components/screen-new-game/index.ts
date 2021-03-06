/*
 * Tyr - Allows online game recording in japanese (riichi) mahjong sessions
 * Copyright (C) 2016 Oleg Klimenko aka ctizen <me@ctizen.net>
 *
 * This file is part of Tyr.
 *
 * Tyr is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Tyr is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Tyr.  If not, see <http://www.gnu.org/licenses/>.
 */

import { Component, Input } from '@angular/core';
import { AppState } from '../../primitives/appstate';
import { RiichiApiService } from '../../services/riichiApi';
import { LUser } from '../../interfaces/local';
import { rand } from '../../helpers/rand';
import { toNumber, uniq, clone, find, remove } from 'lodash';

const DEFAULT_ID = -1;

const defaultPlayer: LUser = {
  displayName: '--- ? ---',
  id: DEFAULT_ID,
  tenhouId: null,
  ident: null,
  alias: null
};

@Component({
  selector: 'screen-new-game',
  templateUrl: 'template.html',
  styleUrls: ['style.css']
})
export class NewGameScreen {
  @Input() state: AppState;
  @Input() api: RiichiApiService;
  public _loading: boolean = false;

  // These are indexes in _players array
  toimen: number = DEFAULT_ID;
  shimocha: number = DEFAULT_ID;
  kamicha: number = DEFAULT_ID;
  self: number = DEFAULT_ID; // Self is always considered east!

  players: LUser[] = [defaultPlayer];
  availablePlayers: LUser[] = [];

  ngOnInit() {
    this._loading = true;

    this.api.getAllPlayers()
      .then((players) => {
        this._loading = false;

        this.players = [defaultPlayer].concat(
          players.sort((a, b) => {
            if (a == b) {
              return 0;
            }
            return (a.displayName < b.displayName ? -1 : 1);
          })
        );

        this.availablePlayers = clone(this.players);
        this._selectCurrentPlayer();
      });
  }

  playersValid(): boolean {
    let playerIds = this._selectedPlayerIds();

    // all players should have initialized ids
    if (playerIds.indexOf(DEFAULT_ID) != -1) {
      return false;
    }

    // all players should be unique
    return uniq(playerIds).length == 4;
  }

  /**
   * randomize seating
   */
  randomize() {
    let randomized = rand(this._selectedPlayerIds());

    this.toimen = randomized[0];
    this.kamicha = randomized[1];
    this.self = randomized[2];
    this.shimocha = randomized[3];
  }

  afterSelect() {
    let playerIds = this._selectedPlayerIds();
    remove(playerIds, (id) => id == DEFAULT_ID);

    // don't display already selected players
    this.availablePlayers = clone(this.players);
    for (let playerId of playerIds) {
      remove(this.availablePlayers, {id: playerId})
    }
  }

  findById(playerId) {
    playerId = toNumber(playerId);
    return find(this.players, {id: playerId});
  }

  disableSelect(value) {
    return value == this.state.getCurrentPlayerId();
  }

  startGame() {
    if (!this.playersValid()) {
      return;
    }

    this._loading = true;
    this.api.startGame(this._selectedPlayerIds()).then(() => {
      this.state._reset();
      this.state.updateCurrentGames();
    });
  }

  private _selectedPlayerIds(): number[] {
    // we had to convert ids to the int
    // to be able properly validate selected players
    return [
      toNumber(this.self),
      toNumber(this.shimocha),
      toNumber(this.toimen),
      toNumber(this.kamicha)
    ];
  }

  private _selectCurrentPlayer() {
    this.self = this.state.getCurrentPlayerId();
    this.afterSelect();
  }
}

