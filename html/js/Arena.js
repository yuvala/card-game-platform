function Arena(entryPoint) {
    this.getJson();
    this.entryPoint = entryPoint;
    this.setPlayers(3);
    this.initDrawPile();
    this.cardsManager = new CardsManager(this);
    this.initBoard();
    this.tm = new TurnsManager();
   
    var el2 = document.getElementById("shuff");
    var dealEl = document.getElementById('deal');
    var selfish = this;

    el2.onclick = function() {
        selfish.shuffleCards();
        dealEl.disabled = false
    }

    dealEl.onclick = function() {
        selfish.stackDeal();
        dealEl.disabled = true;
    }
    
    
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
       this.jsonFile = JSON.parse(request.responseText);
      // alert (my_JSON_object.result[0]);
      // console.log('c.players[0].playerName');
        
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
        if (!this.cardsDisplayed) {
            for (var i = 0; i < this.cardDeck.cards.length; i++) {
                this.entryPoint.appendChild(this.cardDeck.cards[i].getEl());
            }
            this.cardsDisplayed = true;
        }
    },

    shuffleCards: function() {
        this.cardsManager.stackShuffle();
    },

    stackDeal: function() {
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
        var ps = this.jsonFile.players;
        for (var i = 0; i < ps.length; i++) {
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
    }
   
}