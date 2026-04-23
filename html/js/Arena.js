function Arena(entryPoint) {
    this.entryPoint = entryPoint;
    this.jsonFile = {};
    this.drawPile = {};
    this.players = [];
    this.spotId = ['firstSpot', 'secondSpot', 'thirdSpot'];
    this.tableSpotPos = [];
    this.cardsDisplayed = false;
    this.isShuffled = false;
    this.hasDealt = false;
    this.controls = {
        start: document.getElementById('startGame'),
        shuffle: document.getElementById('shuff'),
        deal: document.getElementById('deal')
    };
    this.getJson();
    this.setPlayers(3);
    this.initDrawPile();
    this.cardsManager = new CardsManager(this);
    this.initBoard();
    this.tm = new TurnsManager(this);
   
    var selfish = this;

    this.controls.shuffle.onclick = function() {
        selfish.shuffleCards();
    };

    this.controls.deal.onclick = function() {
        selfish.stackDeal();
    };

    if (this.controls.start) {
        this.controls.start.disabled = true;
    }

    this.updateControls();
}

Arena.prototype = {
    jsonFile:{},
    drawPile: {},
    players: [],
    spotId: ['firstSpot', 'secondSpot', 'thirdSpot'],
    tableSpotPos: [],
    cardsDisplayed: false,
    
    getJson: function(){
       var request = new XMLHttpRequest();
       request.open("GET", "data/players.json", false);
       request.send(null);
       try {
           this.jsonFile = JSON.parse(request.responseText) || {};
       } catch (err) {
           this.jsonFile = {};
       }
    },
    notifyBoard: function(type,arg) {
        if(type == 1){
            StatusBoard.getInstance().currentTurn(arg);
        }else {
            StatusBoard.getInstance().insertLog(arg);
        }
    },
    //DISPLAY ON THE DOM
    showDeck: function() {
        this.cardsManager.showDeck();
    },

    shuffleCards: function() {
        if (this.hasDealt) {
            return;
        }

        this.cardsManager.stackShuffle();
        this.isShuffled = true;
        this.updateControls();
    },

    stackDeal: function() {
        if (!this.isShuffled || this.hasDealt) {
            return;
        }

        this.hasDealt = true;
        this.updateControls();
        var self = this;
        this.cardsManager.stackDeal(function() {
            self.tm.start(self.players.length, self.cardsManager.cardsToDeal);
        });
    },

    getBox: function(id) {
        var ele = document.getElementById(id);
        var top = 0;
        var left = 0;
        var width = ele.clientWidth;
        var height = ele.clientHeight;
        
        while (ele.tagName != "BODY") {
            top += ele.offsetTop;
            left += ele.offsetLeft;
            ele = ele.offsetParent;
        }
        return {
            top: top,
            left: left,
            height: height,
            width: width,
            spotId: id
        };
    },
    getDumpPile:function(){
        return this.getBox('dumpPile');
    },
    setPlayers: function(num) {
        console.log('set players');
        var ps = this.jsonFile.players || [];
        var limit = Math.min(num, ps.length, this.spotId.length);
        for (var i = 0; i < limit; i++) {
            var p = new Player('player' + (i + 1), this.getBox(this.spotId[i]));
            p.playerName = ps[i].playerName;
            p.money = ps[i].money;
            this.players.push(p);
        }
    },
    
    getPlayers: function() {
        return this.players;

    },

    initDrawPile: function() {
        this.drawPile = this.getBox('drawPile');
    },

    initBoard: function() {
        var data = {
            players: this.players,
        }
        var board = StatusBoard.getInstance();
        board.update(data);
        this.entryPoint.appendChild(board.getEl());
        //  StatusBoard.getInstance().update(data);
    },
    cardSelected:function(playerNum, card){
        this.cardsManager.doSelectCard(playerNum, card);
    },
    cleanDump:function(){
        this.cardsManager.clearOldCards();
    },
    updateControls: function() {
        if (this.controls.shuffle) {
            this.controls.shuffle.disabled = this.hasDealt;
        }
        if (this.controls.deal) {
            this.controls.deal.disabled = !this.isShuffled || this.hasDealt;
        }
    }
   
}
