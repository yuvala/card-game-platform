function CardsManager(ep) {
    this.arena = ep;
    this.deck = new Deck();
    this.cardsDisplayed = false;
    this.players = [];
    this.usedCards = [];
    this.createHand();
    this.showDeck();

}


CardsManager.prototype = {
    cardsToDeal: 5,
    cardsDisplayed: null,
    players: [],
    usedCards:[],
    showDeck: function() {
        console.log('showDeck');
        var left = 0,
            zIndex = 100;

        if (!this.cardsDisplayed) {
            for (var i = 0; i < this.deck.cards.length; i++) {
                var card = this.deck.cards[i].createCard();
                left += 20;
                zIndex += 10;
                card.style.left = left + 'px';
                card.style.top = this.arena.drawPile.top + 'px';
                card.style.zIndex = zIndex;
                this.arena.entryPoint.appendChild(card);
            }
            this.cardsDisplayed = true;
        }
    },
    createHand: function() {
        this.players = this.arena.getPlayers();
    },

    stackShuffle: function() {
        var deck = this.deck.cards;
        var currentIndex = deck.length,
            temporaryValue,
            randomIndex;
        //strat spreading    
        for (var i = 0; i < deck.length; i++) {

            var id = this.deck.cards[i].cardId(),
                card = document.getElementById(id);

            card.parentElement.style.left = Math.floor(Math.random() * 622) + 'px';
            card.parentElement.style.top = Math.floor(Math.random() * 600) + 'px';
        }

        //mixing
        while (0 !== currentIndex) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = deck[currentIndex];
            deck[currentIndex] = deck[randomIndex];
            deck[randomIndex] = temporaryValue;

        }
        var self = this;
        setTimeout(function() {
            var left = self.arena.drawPile.left,
                zIndex = 100;

            for (var i = 0; i < deck.length; i++) {

                var id = self.deck.cards[i].cardId(),
                    card = document.getElementById(id);
                //left += 20;

                zIndex += 10;
                card.parentElement.style.left = left + 'px';
                card.parentElement.style.top = self.arena.drawPile.top + 'px';
                card.parentElement.style.zIndex = zIndex;
            }

        }, 1000);


    },

    setPlayers: function(num) {
        this.players = num;
    },

    getfromCashe: function(num) {
        this.stack;
    },

    stackDeal: function(callback) {

        var self = this;
        var cardsAmount = this.cardsToDeal * this.players.length;
        var left, top;
        var i = 0;

        function loopNumbers() {

            if (cardsAmount > 0) {

                if (i > self.players.length - 1) {
                    i = 0;
                }
                var c = self.deck.cards.length - 1;
                var player = self.players[i];
                var gap;
                if (player.hand.length - 1 !== -1) {
                    gap = 90;
                    left = parseInt(player.hand[player.hand.length - 1].getLeft());
                    top = parseInt(player.hand[player.hand.length - 1].getTop());
                }
                else {
                    left = player.tableSpot.left;
                    top = player.tableSpot.top;
                    gap = 0;
                }

                player.hand.push(self.deck.cards.splice(c, 1)[0]);
                var currentCard = player.hand[player.hand.length - 1];
                var spotId = player.tableSpot.spotId;

                if (spotId === 'secondSpot') {

                    currentCard.setLeft(left);
                    currentCard.setClassName(spotId);
                    currentCard.setTop(top + gap);

                }
                else if (spotId === 'thirdSpot') {

                    currentCard.setLeft(left);
                    currentCard.setClassName(spotId);
                    currentCard.setTop(top + gap);
                }
                else {
                    //firstspot -player1
                    currentCard.setLeft(left + gap);
                    currentCard.setClassName(spotId);
                    currentCard.setTop(player.tableSpot.top);
                }

                i++;
                window.setTimeout(loopNumbers, 200);
                cardsAmount--;
            }
            else {
                console.log('cone');
                if (typeof callback === 'function') {
                    callback();
                }
            }
        }
        loopNumbers();
    },
    doSelectCard: function(playerNum, card) {
        card.removeClassName('activated');
        var player = this.players[playerNum];
        var spotId = player.tableSpot.spotId;
        var cardbox = this.arena.getBox(card.cardId());
        var dump = this.arena.getDumpPile();
        if (spotId === 'secondSpot') {
            var t = dump.top - cardbox.width / 2;
            card.markAsSelected(dump.left + dump.width, t);
        }
        else if (spotId === 'thirdSpot') {
            var l = dump.left - cardbox.height;
            var t = dump.top - cardbox.width / 2;
            card.markAsSelected(l, t);
        }
        else {
            var l = dump.left - Math.abs(dump.width / 2 - cardbox.width / 2);
            card.markAsSelected(l, dump.top + dump.height);
        }

        // remove card from player hand and put 
        var i = player.hand.indexOf(card);
        if(i != -1) {
            this.usedCards.push((player.hand.splice(i, 1))[0]);
        }
        
        
    },
    clearOldCards:function(){
        
        for(var i =0; i < this.usedCards.length;i++){
            this.usedCards[i].resetClassName()
           this.usedCards[i].setTop(-500);
           this.usedCards[i].setLeft(-50);
        }

        this.usedCards = [];
    }
}
