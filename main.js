const {app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const args = require('electron-args');
const os = require('os');
const exec = require('child_process').exec;
// const notify = require('electron-notify');

// iniciador win
let win;
let cli = args(`
    app
    Usage
    $ app --arg
    $ app --arg=value
    Options
    --debug     modo debug [Default: false]
    --ssl       protocolo de segurança [Default: false]
    --endpoint  ip ou hostname do totem [Default: localhost]
    --port      porta usada na aplicação [Default: 80]
    --cliente   id do cliente
    --cmd       caminho do java e executavel
    --com
    `,
    {
    default: {
        debug: false,
        ssl: false,
        endpoint: 'localhost',
        port: '8080'
    }
});

console.log('MODO DEBUG?', cli.flags.debug);
console.log('USA SSL?', cli.flags.ssl);
console.log('IP/HOSTNAME DO EMISSOR', cli.flags.endpoint);
console.log('PORTA', cli.flags.port);
console.log('OS', os.hostname());

function createWindow() {
    // cria uma instancia de BrowserWindow
    win = new BrowserWindow({
        width: 800, 
        height: 600,
        // fullscreen: true,
        resizable: false,
        closable: false,
        icon:__dirname+'/favicon.ico',
        webPreferences : {
            preload: path.join(__dirname + '/preload.js')
        }
    });

    // carrega o index.html
    win.loadURL(url.format({
        pathname: path.join(__dirname + '/index.html'),
        protocol: 'file:',
        slashes: true,
    }));

    // remove a barre de menu
    win.setMenu(null);

    // open chrome devtools
    if (cli.flags.debug){
      win.webContents.openDevTools();
    }
    
    win.on('closed', () => {
        win = null;
    });

    // abre a comunicação com a aplicação Angular
    ipcMain.on('com', (e, p) => comunication(e, p));
}

function comunication(e, p) {
    switch (p.evt) {
        case 'login':
          win.setClosable(false);
          break;
        case 'logout':
          win.setClosable(true);
          break;
        case 'startup':
          e.returnValue = { 
            debug: Boolean(cli.flags.debug),
            ssl: Boolean(cli.flags.ssl),
            endpoint: cli.flags.endpoint,
            port: cli.flags.port,
            cliente: cli.flags.cliente,
            hostname: os.hostname(),
            cmd: cli.flags.cmd
          };
        break;
        case 'auth':
          var autentica = p.data;
          var cmd = cli.flags.cmd +" -jar "+cli.flags.com+" "+autentica.cliente+" "+autentica.codAgencia+" "+autentica.agencia+" "+autentica.endereco+" "+autentica.senha+" "+autentica.impressao+" "+autentica.inicioAtendimento+" CAIXA "+autentica.caixaAtendeu+" "+autentica.espera+" "+autentica.terminalAtendeu+"";
          e.returnValue = {
            comandoAuth: cmd
        };
          exec(cmd, function(err, stdout) {
            if (err) { 
                e.returnValue = {
                    erroAuth: err
                }; 
             };
             e.returnValue = {
                stdoutAuth: stdout
            };
          });
        break;
        case 'contingencia':
          var contingencia = p.data;
          var cmd = cli.flags.cmd +" -jar "+cli.flags.com+" __CT__ "+contingencia.senhaInicial+" "+contingencia.senhaFim+" "+contingencia.usaHora+"";
          e.returnValue = {
              comandoContingencia: cmd
          };
          exec(cmd, function(err, stdout) {
            if (err) { 
                e.returnValue = {
                    erroContingencia: err
                }; 
             };
             e.returnValue = {
                stdoutContingencia: stdout
            };
          });
        break;
    }
}

app.on('ready', createWindow);

//quit when all windoes are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) createWindow()
});