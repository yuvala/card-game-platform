var StatusBoard = (function() {
    var instance = '';
    var gameData = {};
    var logDiv = null;

    function createInstance() {
        return StatusBoard;
    }

    function displayPlayes() {
        return StatusBoard;
    }

    return {

        // public interface
        getInstance: function() {
            // all private members are accesible here
            if (!instance) {
                console.log('initial');
                instance = createInstance();
            }
            return instance;
        },
        publicMethod2: function() {},
        getEl: function() {
            var container = document.createElement('div');
            container.className = 'board';
            var gameTitle = document.createElement('div');
            gameTitle.className = 'title';
            var playersTitle = document.createElement('div');
            playersTitle.className = 'title';
            logDiv = document.createElement('div');
            logDiv.className = 'logs';

            //container.innerHTML='Game board;<br> players:<br> status and more';
            container.appendChild(gameTitle);
            container.appendChild(playersTitle);
            container.appendChild(logDiv);

            playersTitle.innerHTML = 'Players:';
            gameTitle.innerHTML = "Game Begin";
            for (var i = 0; i < gameData.players.length; i++) {
                var div = document.createElement('div');
                div.className = '_player';

                div.innerHTML = '<span>player ' + (i + 1) + ': </span><span>' + gameData.players[i].playerName + '</span>';
                playersTitle.appendChild(div);
            }

            return container;
        },
        update: function(data) {
            gameData = data;


        },
        insertLog: function(arg) {
            if (!logDiv) {
                return;
            }
            arg += '<br>' + logDiv.innerHTML;
            logDiv.innerHTML = arg;
        },
        currentTurn: function(arg) {
            var currentTurn = 'currentTurn';
            var p = document.getElementsByClassName('_player');
            for (var i = 0; i < p.length; i++) {
                p[i].classList.remove(currentTurn);
            }
            if (p[arg]) {
                p[arg].classList.add(currentTurn);
            }

        }

    };
})();
