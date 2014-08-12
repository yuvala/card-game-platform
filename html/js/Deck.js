function Deck(){
    this.create();
}
    
Deck.prototype = {
    
    suit:['heart','spade','diamond','club'],
    cardNum:['1','2','3','4','5','6','7','8','9','10','j','q','k'],
    cards:[],
    create:function(){
        var d,cnt=0;
        var self =this;
        self.suit.forEach(function(entry) {
            
            for(var i = 0; i< self.cardNum.length; i++){
                self.cards.push(new Card(self.cardNum[i],entry));
                //console.log(cnt++ + ': ' + self.cardNum[i] +'-'+ entry);
        
         
        }
        });
    }
    
};