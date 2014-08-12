function TurnsManager() {
    this.round = 0;
    this.playerNum = 0;


}

TurnsManager.prototype = {
    round: 0,
    turnDone: false,
    playerNum: 0,
    totalRounds: 0,
    totalPlayers: 0,

    start: function(totalPlayers, totalRounds) {
        this.totalRounds = totalRounds;
        this.totalPlayers = totalPlayers;
        this.playRound();
    },

    playRound: function() {
        if (this.round < this.totalRounds) {
            this.allowedAction();
        }
    },

    allowedAction: function() {
       
        var self = this;
         var event = new Event('roundFinished');
        if (this.playerNum > this.totalPlayers - 1) {
            setTimeout(function() {
              self.processLastRound();  
            },2000);
            this.playerNum = 0;
            this.round++;
            //if all players played their turn.
            if (this.round === this.totalRounds) {
                this.turnDone = true;
                arena.notifyBoard(0,'<b>all round finnished!!!</b>');
            }
        }
        if (!this.turnDone) {
            setTimeout(function() {
                self.addClickFunc(arena.players[self.playerNum]);
                arena.notifyBoard(1,self.playerNum);
            },2000);
        }
    },

    doTurn: function(card) {
        arena.cardSelected(this.playerNum,card);
        card.markAsSelected(arena.getDumpPile());
        arena.notifyBoard(0,arena.players[this.playerNum].playerName + ' played his turn');
        this.removeClickFunc(card);
        this.playerNum++;
        this.playRound();

    },

    addClickFunc: function(player) {
        var callback = function(e,card) {
            arena.tm.doTurn(card);
        }
        this.currentPlayer = player;
        player.grantTurn(callback);
    },
    removeClickFunc: function() {
       this.currentPlayer.revokeTurn();
       
    },
    processLastRound:function(){
        arena.cleanDump();
    }

    
}