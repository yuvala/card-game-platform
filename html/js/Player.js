function Player(name, tableSpot) {
    this.playerName = name;
    this.playerId = '';
    this.money = 10;
    this.hand = [];
    this.tableSpot = tableSpot;
}



Player.prototype = {
    playerName: '',
    playerId:'',
    money: 10,
    hand: null,
    tableSpot: null,
    getHand: function() {
        return this.hand;
    },
    grantTurn: function(callback) {
        for (var i = 0; i < this.hand.length; i++) {
            callback ? this.hand[i].setEvent('click', callback) : this.hand[i].removeEvent('click');
        }
 
    },
    revokeTurn: function() {
        for (var i = 0; i < this.hand.length; i++) {
            this.hand[i].removeEvent('click');
        }
 
    }

}
