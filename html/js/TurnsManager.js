function TurnsManager(arena) {
    this.arena = arena;
    this.round = 0;
    this.playerNum = 0;
    this.turnDone = false;
    this.totalRounds = 0;
    this.totalPlayers = 0;
    this.currentPlayer = null;
}

TurnsManager.prototype = {
    round: 0,
    turnDone: false,
    playerNum: 0,
    totalRounds: 0,
    totalPlayers: 0,

    start: function(totalPlayers, totalRounds) {
        this.round = 0;
        this.playerNum = 0;
        this.turnDone = false;
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
        if (this.playerNum > this.totalPlayers - 1) {
            setTimeout(function() {
              self.processLastRound();  
            },2000);
            this.playerNum = 0;
            this.round++;
            //if all players played their turn.
            if (this.round === this.totalRounds) {
                this.turnDone = true;
                this.arena.notifyBoard(0,'<b>all round finnished!!!</b>');
            }
        }
        if (!this.turnDone) {
            setTimeout(function() {
                self.addClickFunc(self.arena.players[self.playerNum]);
                self.arena.notifyBoard(1,self.playerNum);
            },2000);
        }
    },

    doTurn: function(card) {
        this.arena.cardSelected(this.playerNum,card);
        this.arena.notifyBoard(0,this.arena.players[this.playerNum].playerName + ' played his turn');
        this.removeClickFunc();
        this.playerNum++;
        this.playRound();

    },

    addClickFunc: function(player) {
        var self = this;
        if (!player) {
            return;
        }

        var callback = function(e,card) {
            self.doTurn(card);
        };
        this.currentPlayer = player;
        player.grantTurn(callback);
    },
    removeClickFunc: function() {
       if (this.currentPlayer) {
           this.currentPlayer.revokeTurn();
           this.currentPlayer = null;
       }
       
    },
    processLastRound:function(){
        this.arena.cleanDump();
    }

    
}
