


var arena ;
(function(){
    
    var tid = setInterval( function () {
        if ( document.readyState !== 'complete' ) return;
        clearInterval( tid );       
   
        var el = document.getElementById("startGame");
        el.onclick= function(){
            beginGame();
        };
       
    
         
    }, 100 );
    
   
    
    

})();

function beginGame() {
     
        var entryPoint = document.getElementById('main');
        if(!arena) {
            arena = new  Arena(entryPoint);
        }
}