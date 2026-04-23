


var arena ;
(function(){
    function bindStartButton() {
        var el = document.getElementById("startGame");
        if (!el) {
            return;
        }

        el.onclick= function(){
            beginGame();
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindStartButton);
        return;
    }

    bindStartButton();
})();

function beginGame() {
     
        var entryPoint = document.getElementById('main');
        if(!arena) {
            arena = new  Arena(entryPoint);
        }
}
