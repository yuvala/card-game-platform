

function cardId() {
    return this.num + this.suit;
    }


function Card(num,suit) {
    this.num = num;
    this.suit = suit;
    this.cardId = cardId;
   
 }
 Card.prototype = {
    getCard:{},
    createCard:function(){
        var card = document.createElement('div'),
            container = document.createElement('div'),
            front = document.createElement('div'),
            back = document.createElement('div');
        
        container.className = 'cardContainer'; 
        card.className = 'card';
        front.className = 'front   ' + this.suit;
        back.className = 'back  ';
        
        front.innerHTML = this.num + '<span class="symbol">'+this.getSymbol()+'</span>';
        card.id = this.cardId();
        
        card.appendChild(front);
        card.appendChild(back);
        container.appendChild(card);
        this.getCard = container;
        return container;
    },
    suitEnum: {heart : '&hearts;',club : '&clubs;',spade : '&spades;', diamond:'&diams;'},
    
    getSymbol: function() {
       // return this.suitEnum.GREEN;
        var x;
        switch (this.suit)
        {
            case 'heart':
              x=this.suitEnum.heart;
              break;
            case 'club':
              x=this.suitEnum.club;
              break;
            case 'spade':
              x=this.suitEnum.spade;
              break;
            case 'diamond':
              x=this.suitEnum.diamond;
                break;
        }
        return x;
    },
    status: null,
    domElement: function(){
        return document.getElementById(this.cardId());
    },
    
    getLeft: function() {
        return this.domElement().parentElement.style.left;
    },
    setLeft: function(_left) {
        this.domElement().parentElement.style.left=_left;
    },
    
    getTop: function() {
        return this.domElement().parentElement.style.top;
    },
    setTop: function(_top) {
        this.domElement().parentElement.style.top=_top;
    },
    setClassName: function(cssClass) {
        this.domElement().parentElement.className = this.domElement().parentElement.className +' '+ cssClass;
    },
    setEvent: function(type,callback){
        if(type === 'click'){
            var self= this;
            this.getCard.className += ' activated';
            this.getCard.onclick = function(e) {
                console.log('card clicked!');
                callback(e,self);
            }
        }
    },
    markAsSelected: function(left,top) {
        this.setTop(top);
        this.setLeft(left);
        
    },
    removeClassName: function(cssClass) {
        this.getCard.classList.remove(cssClass);
    },
    removeEvent:function(type){
        this.removeClassName('activated');
        if(type === 'click'){
            this.getCard.onclick='';
        }
    
        
    },
    resetClassName:function(){
        this.domElement().parentElement.className = 'cardContainer'; 
    }
    
 }