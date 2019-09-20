/////// CONFIG TEMPLATE ////
// const { ipcRenderer } = require('electron');
///////////////// START CONFIG /////////////////
var BASE_URL;
var suffix;
var protocol;
// var retorno = ipcRenderer.sendSync('com', { 'evt': 'startup' });
var retorno = undefined;
console.log('retorno do electron', retorno);
var isWeb = retorno !== undefined ? false : true;

var ATENDIMENTO;
var USER;
var UTIL;
var AGENCIA;
var IDENTIFICACAO;

var FIDELIZE = true;
var USAFOTO = false;

var DEBUG = 0;

print('V 1.2.0');

if(DEBUG == 2){
    BASE_URL    = 'json/';
    suffix      = '.json';
}else if(DEBUG == 1){
    if (isWeb) {
        // BASE_URL = 'http://A000001:8080/'
        // BASE_URL    = location.protocol + '//' + location.host.substring(0,9) + ':8080/';
	    BASE_URL    = location.protocol + '//' + location.host.split(':')[0] + ':8080/'
    } else {
        protocol = retorno.ssl ? 'https:' : 'http:';
        BASE_URL    = protocol + '//' + retorno.endpoint + ':8080/';
    }
    suffix      = '';
}else{
    if (isWeb) {
        // BASE_URL    = location.protocol + '//' + location.host.substring(0,9) + '/';
		BASE_URL    = location.protocol + '//' + location.host.split(':')[0] + ':8080/'
    } else {
        protocol = retorno.ssl ? 'https:' : 'http:';
        BASE_URL    = protocol + '//' + retorno.endpoint + '/';
    }
    suffix      = '';
}

ATENDIMENTO   = BASE_URL+'atendimento/';
USER          = BASE_URL+'ws/us/';
UTIL          = BASE_URL+'utils/';
AGENCIA       = BASE_URL+'agencia/';
IDENTIFICACAO = BASE_URL+'identificacao/';

// Reativar Rechamar
var contadorRechamar;
var tempoReativar   = 2000; // 2s

// Timer Atendimento
var contadorAtendimento;
var segsAtend = 0;

// Timer Atendimento
var contadorSuspensao;
var segsSusp = 0;

// Chamada Busca Atendimento Pendente
var contadorBusca;
var tempoBusca      = 15000; // 30s

// Tempos das Páginas de Monitoramento
var contadorCategorias;
var tempoCategorias = 15000;
var contadorSenhas;
var tempoSenhas     = 60000;
var contadorCaixas;
var tempoCaixas     = 60000;

///////////////// END CONFIG /////////////////

var lastAction;
var currentUser;
var idAtendimento;
var catAtendimento;
var emAtendimento = false;
var labelSuspensao = '';
var usaLocucao = 'N';
var senhaAtual;

var bt_ativos   = [];

var today = new Date();
var dd = today.getDate();

var mm = today.getMonth()+1;
var yyyy = today.getFullYear();
if(dd<10){
    dd='0'+dd;
}
if(mm<10){
    mm='0'+mm;
}
var hoje = dd+'/'+mm+'/'+yyyy;

if (isWeb) {
  window.onbeforeunload = function(){
    if(currentUser != undefined){
      return 'Você precisa fazer logout antes de fechar esta janela.';
    }
  }
}

$(function () {
    if (currentUser === undefined || currentUser === null) {
        $('#main .main_content').load('content/home.html', function(){
            $('#login').submit(function(){
                $('#main').showLoading();

                if($('#matricula').val()==''){
                    setTimeout(function(){
                        showMessage('Informe a matrícula');
                        $('#main').hideLoading();
                    }, 1000);
                    return false;
                }
                // $('#login').append('<div class="overlay" style="position:absolute; width:100%;height: 100%; top:0;left:0; background:#FAFAFA; display:none;"></div>');//css({'opacity':.6});
                // $('#login .overlay').fadeTo( "fast", 0.5 );

                var formData = {
                    "hostname"  : $('#matricula').val().toUpperCase(),
                    "matricula" : $('#matricula').val().toUpperCase()
                };

                // LOGIN
                console.log('URL', USER+'login');
                $.ajax({
                    type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                    url			: USER+'login'+suffix, // the url where we want to POST
                    contentType : 'application/json',
                    data		: JSON.stringify(formData), // our data object
                    dataType	: 'json', // what type of data do we expect back from the server
                    encode		: true
                }).done(function(data) {
                    if(data.usuarioID>0){
                        currentUser = data;
                        // ipcRenderer.send('com', { 'evt': 'login' });

                        if(currentUser.usuarioTipo == 1){
                            $('.monitor_only').css({'display':'none'})
                        }

                        $('#nome_atendente').text(currentUser.usuarioNome);
                        loadAtendimento();

                    }else if(data.error.indexOf('EMISSOR NÃO ENCONTRADO') != -1){
                        showMessage(data.error);
                    }else{
                        showForceLogoff($('#matricula').val());
                        showMessage(data.error);
                    }
                    // $('#login .overlay').fadeOut( "fast" );
                    $('#main').hideLoading();
                }).fail(function(){
                    showMessage('Totem Indisponível! Entre em contato com a área de suporte.');
                    $('#main').hideLoading();
                });
                return false;
            });
        });
    }else{
        if(currentUser.usuarioID !== ''){
            $('#nome_atendente').text(currentUser.usuarioNome);
            loadAtendimento();
        }
    }

    $('#bt_atender').click(function(e){
        e.preventDefault();
        closeMenuRetratil();
        loadAtendimento();
        setarMenu($(this));
    });
    $('#bt_monitor').click(function(e){
        e.preventDefault();
        closeMenuRetratil();
        loadMonitor();
        setarMenu($(this));
    });

    $('#bt_configuracoes').click(function(e){
        e.preventDefault();
        closeMenuRetratil();
        loadConfiguracoes();
        setarMenu($(this));
    });

    $('.bt_menu_retratil').click(function(e){
        e.preventDefault();
        if(!emAtendimento){
            openMenuRetratil();
        }else{
            showMessage('Você só pode acessar este menu enquanto não estiver em atendimento.');
        }
    });

    $('.close').click(function(e){
        e.preventDefault();
        closeMenuRetratil()
    });

    $('.modal .closebtn').click(function(e){
        e.preventDefault();
        closeModal();
    });

    $('#bt_logoff').click(function(e){
        e.preventDefault();
        logOff();
    });
});

// FORÇAR LOGOFF DE USUARIO CASO ESTEJA LOGADO EM OUTRA ESTAÇÃO
function showForceLogoff(matricula) {
    $('.modal .modal_content').load('modal/force-logoff.html', function(){
        $('#cancelar').click(function(e){
            $('#login .overlay').fadeOut( "fast" );
            e.preventDefault();
            closeModal();
        });

        $('form').submit(function(e){
            e.preventDefault();
            var formData = {
                'matricula' : matricula.toUpperCase(),
                'hostname'  : matricula.toUpperCase()
            };

            $.ajax({
                type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                url			: USER+'logoff'+suffix, // the url where we want to POST
                contentType : 'application/json',
                data		: JSON.stringify(formData), // our data object
                dataType	: 'json', // what type of data do we expect back from the server
                encode		: true
            }).done(function(data) {
                if(data.logoff == true){
                    var formData = {
                        "hostname"  : matricula,
                        "matricula" : matricula
                    };

                    // FAZ NOVAMENTE O LOGIN DO USUARIO NA ESTAÇÃO ATUAL
                    $.ajax({
                        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                        url			: USER+'login'+suffix, // the url where we want to POST
                        contentType : 'application/json',
                        data		: JSON.stringify(formData), // our data object
                        dataType	: 'json', // what type of data do we expect back from the server
                        encode		: true
                    }).done(function(data) {
                        if(data.usuarioID>0){
                            currentUser = data;
                            // ipcRenderer.send('com', { 'evt': 'login' });

                            if(currentUser.usuarioTipo == 1){
                                $('.monitor_only').css({'display':'none'})
                            }

                            $('#nome_atendente').text(currentUser.usuarioNome);
                            $('#login .overlay').fadeOut( "fast" );
                            closeModal();
                            loadAtendimento();
                        }else{
                            showMessage(data.error);
                        }
                    });
                }
            });
        });
    }, $('.modal').fadeIn());
}

function setarMenu(menu_item){
  $('.menu_retratil ul li').removeClass('active');
  $(menu_item).parent().addClass('active');
}

// ABRIR MENU LATERAL
function openMenuRetratil(){
  $('.menu_retratil')
  .stop()
  .animate({marginLeft: '0'}, 500, "linear");
}

// FECHAR MENU LATERAL
function closeMenuRetratil(){
  $('.menu_retratil')
  .stop()
  .animate({marginLeft: '-200px'}, 200, "linear");
}

// MOSTRA UM SNACKBAR COM UMA MENSAGEM
function showMessage(msg){
    $('#system_messages .content_message').text(msg);
    $('#system_messages')
    .animate({marginBottom: '20px'}, 100, "linear", function() {
      $('#system_messages').delay(2000).animate({marginBottom: '-200px'}, 100, "linear");
    });
}

// LOGOFF DE USUARIO
function logOff(){
  var formData = {
      'matricula' : currentUser.usuarioID,
      'hostname'  : currentUser.usuarioID
  };
  $.ajax({
      type		    : 'POST', // define the type of HTTP verb we want to use (POST for our form)
      url			: USER+'logoff'+suffix, // the url where we want to POST
      contentType   : 'application/json',
      data		    : JSON.stringify(formData), // our data object
      dataType	    : 'json', // what type of data do we expect back from the server
      encode		: true
  }).done(function(data) {
      if(data.logoff == true){
        // ipcRenderer.send('com', { 'evt': 'logout' });
        contagemBuscaStop();
        hideBarsMenu();
        $('#footer').css({'display':'none'});
  			$('.menu_retratil').css({'margin-left':'-100%'});
        window.location = 'index.html';
      }
  });
}

// MOSTRA BARRA INDICANDO QUE EMISSOR NÃO ESTÁ CONECTADO
function showFalhaEmissor(msg){
  $('#falha_emissor').text(msg);
  $('#falha_emissor').css({'display':'block'});
  $('#footer').css({'display':'none'});
}

// QUANDO EMISSOR ESTÀ CONECTADO ESCONDE A BARRA
function hideFalhaEmissor(){
  $('#footer').css({'display':'block'});
  $('#falha_emissor').css({'display':'none'});
}

function busca(){
    var formData = {
        'id'            : currentUser.emissorID,
        'token'         : currentUser.emissorToken,
        'tipoRetorno'   : "1"
    };
    $.ajax({
        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
        url			: USER+'busca'+suffix, // the url where we want to POST
        contentType : 'application/json',
        data		: JSON.stringify(formData), // our data object
        dataType	: 'json', // what type of data do we expect back from the server
        encode		: true
    }).done(function(data) {
        if(data.error){
            showFalhaEmissor(data.error);
        }else if(data.senhas.length>0){
            hideFalhaEmissor();
            var date = new Date();
            print('buscando: '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds());

            // Atualiza política do atendente se esta mudou
            if($('.politica_value').text() != data.politicaFormatada){
              $('.politica_value').text(data.politicaFormatada);
              print('Política mudou');
            }

            var fila = [];
            var cats_fila = [];
            var total_agencia = 0;
            var qt_senhas = data.senhas.length;
            for(var i = 0; i<qt_senhas; i++){
              if(data.senhas[i]['total']>0){
                fila = [data.senhas[i]['idCategoria'], data.senhas[i]['total']];
                cats_fila.push(fila);
                total_agencia = total_agencia+data.senhas[i]['total'];
              }
            }
            $('.espera_agencia .count').html(total_agencia);

            var arrPolitica = [];
            var qt_politica = data.politica.length;
            for(var p = 0; p<qt_politica; p++){
              arrPolitica.push(data.politica[p].categoria.id);
            }

            // Total atendimento para este usuário
            var total_atendente = 0;
            var qt_fila = cats_fila.length;
            var qt_poli = arrPolitica.length;
            for(var f = 0; f<qt_fila; f++){
              var cat = cats_fila[f];
              for(var p2 = 0; p2 < qt_poli; p2++){
                var pol = arrPolitica[p2];
                if(cat[0] == pol){
                  total_atendente += cat[1];
                }
              }
            }
            $('.espera_atendente .count').html(total_atendente);

            if(lastAction == 'descancelar'){
              ativar('bt_chamar_voz, bt_rechamar, bt_iniciar_atendimento, bt_cancelar');
            }else if(lastAction == 'cancelar'){
              ativar('bt_chamar_voz, bt_chamar, bt_descancelar, bt_suspender');
            }else if( (total_atendente>0) && emAtendimento == false){
              ativar('bt_chamar_voz, bt_chamar, bt_suspender');
            }else if( (total_atendente == 0) && emAtendimento == false){
              ativar('bt_suspender');
            }
        }else{
          desativar();
        }
    }).fail(function() {
      showFalhaEmissor('Falha na comunicação com o emissor.');
    });
}
// EXECUTA O BUSCA DE TEMPOS EM TEMPOS
function contagemBuscaStart(){
  contadorBusca = setInterval(busca, tempoBusca);
}
// PARA A EXECUÇÃO DO BUSCA
function contagemBuscaStop(){
  clearInterval(contadorBusca);
}

// EXECUTA O SERVIÇO DE MONITORAMENTO DAS CATEGORIAS
function contagemCategoriasStart(){
    contadorCategorias = setInterval(reloadCategoriasList, tempoCategorias);
}
// PARA O SERVIÇO DE MONITORAMENTO DE CATEGORIAS
function contagemCategoriasStop(){
    clearInterval(contadorCategorias);
}

// DESATIVA O RECHAMAR
function desativaRechamar(){
  contadorRechamar = setInterval(reativarRechamar, tempoReativar);
}
// ATIVA o RECHAMAR
function reativaRechamar(){
  clearInterval(contadorRechamar);
}
// REATIVA O RECHAMAR E OS BOTOES DE AUDIO, INICIAR ATDO E CANCELAR
function reativarRechamar(){
  ativar('bt_chamar_voz, bt_rechamar, bt_iniciar_atendimento, bt_cancelar');
  reativaRechamar();
}

// CONTADOR DE SENHAS
function contagemSenhasStart(){
    contadorSenhas = setInterval(reloadSenhasList, tempoSenhas);
}
// PARA O CONTADOR DE SENHAS
function contagemSenhasStop(){
    clearInterval(contadorSenhas);
}

// CONTAGEM PARA O SERVIÇO DE HISTÓRICO DE CAIXAS
function contagemCaixasStart(){
    contadorCaixas = setInterval(reloadCaixasList, tempoCaixas);
}
// PARA O SERVIÇO DE CONTAGEM DO HISTORICO DE CAIXAS
function contagemCaixasStop(){
    clearInterval(contadorCaixas);
}

// MÉTODO DE CONTROLE DE ATIVAÇÃO DOS BOTÕES DE ATENDIMENTO
function ativar(botoes){
  // Desativa todos os botões (evita o dedo louco)
  desativar();

  bt_ativos = [];

  var i = 0;
  var bts = botoes.split(',');
  var qt  = bts.length;
  for(i=0; i<qt; i++){
      var botao = $.trim(bts[i]);
      $('#'+botao).removeClass('disabled');

      if(botao == 'bt_descancelar'){
          $('#bt_cancelar').css({'display':'none'});
          $('#bt_descancelar').css({'display':'block'});
      }else if(botao == 'bt_cancelar'){
          $('#bt_cancelar').css({'display':'block'});
          $('#bt_descancelar').css({'display':'none'});
      }
      bt_ativos.push(botao);
  }
}

//DESTIVA TODOS OS BOTOES
function desativar(){
    $('.menu_atendimento a').addClass('disabled');
}

function closeModal(){
    $('.modal').fadeOut();
}

function showBarsMenu(){
    $('.bt_menu_retratil').fadeIn(); //.addClass('logado');//.fadeIn();//.css({'display':'inline-block', 'padding-right':'10px'});
}
function hideBarsMenu(){
    $('.bt_menu_retratil').fadeOut(); //.removeClass('logado');//.fadeOut();//.css({'display':'none'});
}

function loadSuspenso(){
    hideBarsMenu();
    $('#footer').css({'display':'none'});
    $('#main .main_content').load('content/suspenso.html', function(){
      $('#motivo_suspensao').text(labelSuspensao);
      contagemSuspensaoStart();
      function formatatempo(segs) {
        var min = 0;
        var hr  = 0;
        while(segs>=60) {
          if (segs >=60) {
            segs = segs-60;
            min = min+1;
          }
        }
        while(min>=60) {
          if (min >=60) {
            min = min-60;
            hr = hr+1;
          }
        }
        if (hr < 10) {hr = "0"+hr}
        if (min < 10) {min = "0"+min}
        if (segs < 10) {segs = "0"+segs}
        var fin = hr+":"+min+":"+segs;
        return fin;
      }
      function contagemSusp(){
        segsSusp++;
        var t = formatatempo(segsSusp);
        $("#contadorSuspensao").html(t);
      }
      function contagemSuspensaoStart(){
        contadorSuspensao = setInterval(contagemSusp, 1000);
      }
      function contagemSuspensaoStop(){
        segsSusp = 0;
        $("#contadorSuspensao").html('00:00:00');
        clearInterval(contadorSuspensao);
      }
      $('#bt_retornar').click(function(e){
          e.preventDefault();
          var formData = {
              'idUsuario'     : currentUser.usuarioID,
              'token'         : currentUser.emissorToken,
              'idCaixa'       : currentUser.emissorID
          };

          // RETORNO DA SUSPENSÃO
          $.ajax({
            type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
            url			: USER+'retorno'+suffix, // the url where we want to POST
            contentType : 'application/json',
            data		: JSON.stringify(formData), // our data object
            dataType	: 'json', // what type of data do we expect back from the server
            encode		: true
          }).done(function(data) {
              if(data.status==true){
                emAtendimento = false;
                contagemSuspensaoStop();
                loadAtendimento();
              }
          });
      });
    });
}

function loadAtendimento(){
    contagemCategoriasStop();
    contagemSenhasStop();
    contagemCaixasStop();
    showBarsMenu();
    emAtendimento = false;
    $('#footer').css({'display':'block'});
    $('#main .main_content').load('content/atendimento.html', function(){

        // Inicia desativado por padrão
        desativar();
        $('.posicao_value').text(currentUser.aliasCaixa);
        $('.hostname_value').text(currentUser.hostname);
        $('.matricula_value').text(currentUser.usuarioID);
        $('.politica_value').text(currentUser.politicaFormatada);

        $('.card_terminal').css({'display':'inline-block'});

        // Inicia a busca por senhas
        busca();
        contagemBuscaStart();

        $('#bt_chamar_voz').click(function(e){
          e.preventDefault();
          if($.inArray( 'bt_chamar_voz' , bt_ativos ) !== -1){
            atendimentoChamarVoz();
          }
        });

        $('#bt_chamar').click(function(e){
          e.preventDefault();
          if($.inArray( $(this).attr('id') , bt_ativos ) !== -1){
            closeMenuRetratil();
            atendimentoChamar();
          }
        });

        $('#bt_rechamar').click(function(e){
          e.preventDefault();
          if($.inArray( $(this).attr('id') , bt_ativos ) !== -1){
            closeMenuRetratil();
            atendimentoReChamar();
          }
        });

        $('#bt_iniciar_atendimento').click(function(e){
          e.preventDefault();
          if($.inArray( $(this).attr('id') , bt_ativos ) !== -1){
            closeMenuRetratil();
            atendimentoIniciarAtendimento();
          }
        });

        $('#bt_redirecionar').click(function(e){
          e.preventDefault();
          if($.inArray( $(this).attr('id') , bt_ativos ) !== -1){
            closeMenuRetratil();
            promptRedirecionar();
          }
        });

        $('#bt_cancelar').click(function(e){
          e.preventDefault();
          if($.inArray( $(this).attr('id') , bt_ativos ) !== -1){
            closeMenuRetratil();
            atendimentoCancelar();
          }
        });

        $('#bt_descancelar').click(function(e){
          e.preventDefault();
          if($.inArray( $(this).attr('id') , bt_ativos ) !== -1){
            closeMenuRetratil();
            atendimentoDescancelar();
          }
        });

        $('#bt_finalizar').click(function(e){
          e.preventDefault();
          if($.inArray( $(this).attr('id') , bt_ativos ) !== -1){
            closeMenuRetratil();
            atendimentoFinalizar();
          }
        });

        $('#bt_suspender').click(function(e){
            e.preventDefault();
            if($.inArray( $(this).attr('id') , bt_ativos ) !== -1){
              closeMenuRetratil();
              atendimentoSuspender();
            }
        });
    });
}

// ABRE o MODAL DE REDIRECIONAR
function openModalRedirecionar(data) {
  $('.modal .modal_content').load('modal/redirecionar.html', function(){
    var html_categorias = '';
    $.each(data, function() {
      $.each(this, function(k, v) {
        if(catAtendimento != v.idCategoria){
          html_categorias += '<option value="'+v.idCategoria+'">'+v.nomeCategoria+'</option>';
        }
      });
    });
    $('#redirecionar_categorias').html(html_categorias);
    $('#cancelar').click(function(e){
        e.preventDefault();
        closeModal();
    });

    $('form').submit(function(e){
      e.preventDefault();
      var idCategoria = $('#redirecionar_categorias').val();
      var priorizar   = ($('#redirecionar_priorizar').is(':checked')) ? true : false;
      var obs         = $('#redirecionar_obs').val();
      var formData = {};
      if(obs != ''){
          formData = {
              "idUsuario"     : currentUser.usuarioID,
              "idAtendimento" : idAtendimento,
              "categoria"     : new Number(idCategoria),
              "priorizar"     : priorizar,
              "obs"           : obs
          };
      }else{
          formData = {
              "idUsuario"     : currentUser.usuarioID,
              "idAtendimento" : idAtendimento,
              "categoria"     : new Number(idCategoria),
              "priorizar"     : priorizar
          };
      }

      // SERVIÇO DE REDIRECIONAR SENHA
      $.ajax({
          type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
          url			: ATENDIMENTO+'redirecionarSenha'+suffix, // the url where we want to POST
          contentType : 'application/json',
          data		: JSON.stringify(formData), // our data object
          dataType	: 'json', // what type of data do we expect back from the server
          encode		: true
      }).done(function(data) {
        if(data.retorno == true){
          lastAction = 'redirecionar';
          showMessage('Senha '+senhaAtual+' redirecionada com sucesso.');
          closeModal();
          emAtendimento = false;
          contagemAtendimentoStop();
          loadAtendimento();
        }
      });
    });
  }, $('.modal').fadeIn());
}

// ABRE o MODAL DE SUSPENSÃO DO USUÁRIO
function openModalSuspender(data) {
  $('.modal .modal_content').load('modal/suspender.html', function(){
    var html_categorias = '';
    $.each(data, function() {
        $.each(this, function(k, v) {
            html_categorias += '<option value="'+v.id+'">'+v.descricao+'</option>';
        });
    });
    $('#suspender_categorias').html(html_categorias);
    $('#cancelar').click(function(e){
      e.preventDefault();
      closeModal();
    });

    $('form').submit(function(e){
      e.preventDefault();
      var motivoSuspensao = $('#suspender_categorias').val();

      // Pra mostrar na tea de Suspensão
      labelSuspensao = $('#suspender_categorias option:selected').text();

      var formData = {
        'idUsuario'         : currentUser.usuarioID,
        'motivoSuspensao'   : motivoSuspensao
      };

      $.ajax({
        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
        url			: USER+'suspender'+suffix, // the url where we want to POST
        contentType : 'application/json',
        data		: JSON.stringify(formData), // our data object
        dataType	: 'json', // what type of data do we expect back from the server
        encode		: true
      }).done(function(data) {
        if(data.status == true){
          lastAction = 'suspender';
          closeModal();
          emAtendimento = false;
          contagemAtendimentoStop();
          contagemBuscaStop();
          loadSuspenso();
        }
      });
    });
  });
  $('.modal').fadeIn();
}

function openModalFinalizar(data) {
  $('.modal .modal_content').load('modal/finalizar.html', function(){
    var html_categorias = '';
    $.each(data, function() {
        $.each(this, function(k, v) {
            html_categorias += '<option value="'+v.idObjetivo+'">'+v.objetivo+'</option>';
        });
    });

    $('#finalizar_categorias').html(html_categorias);
    $('#cancelar').click(function(e){
      e.preventDefault();
      closeModal();
    });

    $('form').submit(function(e){
      e.preventDefault();
      var objetivoAtendimento = $('#finalizar_categorias').val();
      var formData = {
          'idUsuario'     : currentUser.usuarioID,
          'token'         : currentUser.emissorToken,
          'idAtendimento' : idAtendimento,
          'objetivo'      : objetivoAtendimento
      };

      $.ajax({
        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
        url			: ATENDIMENTO+'finalizarSenha'+suffix, // the url where we want to POST
        contentType : 'application/json',
        data		: JSON.stringify(formData), // our data object
        dataType	: 'json', // what type of data do we expect back from the server
        encode		: true
      }).done(function(data) {
        if(data.idAtendimento>0){
          lastAction = 'finalizar';
          closeModal();
          emAtendimento = false;
          contagemAtendimentoStop();
          loadAtendimento();
        }
      });
    });
  }, $('.modal').fadeIn());
}

function loadMonitor(){
    showBarsMenu();
    $('#footer').css({'display':'none'});
    contagemBuscaStop();
    getMonitoramentoCategoria();
    contagemCategoriasStart();
}

function getMonitoramentoCategoria(){
    contagemSenhasStop();
    contagemCaixasStop();

    $('#main .main_content').load('content/monitor-categorias.html', function(){
        
        $('.view_categorias_filas').click(function(e){
          e.preventDefault();
          $('.list_monitor_senhas, .list_monitor_caixas').hideLoading();
        });

        $('.view_historico_senhas').click(function(e){
          e.preventDefault();
          $('.list_monitor, .list_monitor_caixas').hideLoading();
          getMonitoramentoSenhas();
          contagemSenhasStart();
        });

        $('.view_historico_caixas').click(function(e){
          e.preventDefault();
          $('.list_monitor, .list_monitor_senhas').hideLoading();
          getMonitoramentoCaixas();
          contagemCaixasStart();
        });

        $('.list_monitor').showLoading();

        var date = new Date();
        var formData = {};

        // SERVIÇO DE MONITORAMENTO DE CATEGORIA
        $.ajax({
          type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
          url			: UTIL+'getMonitoramentoCategoria'+suffix, // the url where we want to POST
          contentType : 'application/json',
          data		: JSON.stringify(formData), // our data object
          dataType	: 'json', // what type of data do we expect back from the server
          encode		: true
        }).done(function(data) {
            if(data){
              var item = '';
              $.each(data, function() {
                $.each(this, function(k, v) {
                  var cor_item = '';
                  var bg_verde    = false;
                  var bg_amarelo  = false;
                  var bg_vermelho = false;

                  $.each(v.senhaEmAberto, function(k, v2) {
                    var meta    = (v2.porcMeta/v.metaDia)*100;
                    meta = parseFloat(Math.round(meta * 100) / 100).toFixed(2);

                    if(meta >= v.minVermelho){
                      bg_vermelho = true;
                    }else if(meta >= v.minAmarelo){
                      bg_amarelo = true;
                    }else{
                      bg_verde = true;
                    }
                  });

                  if(bg_verde == true){
                    cor_item = 'bg_verde';
                  }
                  if(bg_amarelo == true){
                    cor_item = 'bg_amarelo';
                  }
                  if(bg_vermelho == true){
                    cor_item = 'bg_vermelho';
                  }
                  item += '<tr id="categoria'+v.idCategoria+'"><td class="align_left">'+v.nomeCategoria+'</td><td class="totalSenhaEmAberto">'+v.totalSenhaEmAberto+'</td><td class="status"><span class="bolinha '+cor_item+'"></span></td><td><a data-id="'+k+'" class="view_fila_detalhe" href="#"><i class="fas fa-eye"></i></a></td></tr>';
                });
              });
              $('.list_monitor tbody').html(item);
            }

            $('.view_fila_detalhe').click(function(e){
                e.preventDefault();
                var id = $(this).data('id');
                $('.modal .modal_content').load('modal/monitor-fila.html', function(){
                    var aCategoria = data.categorias[id];
                    $('#fila_nomeCategoria').text(aCategoria.nomeCategoria);
                    $('#fila_tempoMedioEspera').text(aCategoria.tempoMedioEspera);
                    $('#fila_metaDia').text((aCategoria.metaDia/60)+' MIN.');
                    $('#fila_minAmarelo').text(aCategoria.minAmarelo);
                    $('#fila_minVermelho').text(aCategoria.minVermelho);

                    var senha_list = '';

                    for(var f = 0; f<data.categorias[id].senhaEmAberto.length; f++){
                      var oItem = data.categorias[id].senhaEmAberto[f];
                      var priorizar = oItem.priorizado == true ?
                        '<a data-set_priorizar="false" data-senha="'+oItem.senha+'" class="priorizar_senha" id="'+oItem.idAtendimento+'" href="#"><i class="fas fa-check-circle"></i></a>' :
                        '<a data-set_priorizar="true" data-senha="'+oItem.senha+'" class="priorizar_senha" id="'+oItem.idAtendimento+'" href="#"><i class="fas fa-times-circle"></i></a>';
                      var espera  = oItem.tempoEspera ? oItem.tempoEspera : 'N/A';
                      var meta    = (oItem.porcMeta/aCategoria.metaDia)*100;
                      meta = parseFloat(Math.round(meta * 100) / 100).toFixed(2);
                      var cor = '';
                      if(meta>=aCategoria.minVermelho){
                        cor = 'bg_vermelho';
                      }else if(meta>=aCategoria.minAmarelo){
                        cor = 'bg_amarelo';
                      }else{
                        cor = 'bg_verde';
                      }
                      senha_list += '<tr id="senha'+oItem.senha+'"><td><span class="bolinha '+cor+'"></span></td><td>'+oItem.senha+'</td><td>'+oItem.dtImpressao+'</td><td>'+espera+'</td><td>'+meta+'</td><td><a data-id="'+oItem.idAtendimento+'" class="cancelar_senha" href=""><i class="fas fa-times-circle"></i></a></td><td class="stt_priorizar">'+priorizar+'</td></tr>';
                    }
                    $('.list_monitor_fila tbody').html(senha_list);
                    $('.cancelar_senha').click(function(e){
                        e.preventDefault();
                        var atend = $(this).data('id');
                        var formData = {
                            'idUsuario'         : currentUser.usuarioID,
                            'token'             : currentUser.emissorToken,
                            'idAtendimento'     : atend
                        };

                        // SERVIÇO DE CANCELAR SENHA USADO NO MONNITORAMENTO DE CATEGORIAS
                        $.ajax({
                            type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                            url			: ATENDIMENTO+'cancelarSenha'+suffix, // the url where we want to POST
                            contentType : 'application/json',
                            data		: JSON.stringify(formData), // our data object
                            dataType	: 'json', // what type of data do we expect back from the server
                            encode		: true
                        }).done(function(data) {
                          if(data.retorno == true){
                            showMessage('Senha '+data.idAtendimento+' cancelada com sucesso');
                            $('#senha'+data.idAtendimento).css({'display':'none'});
                          }
                        });
                    });

                    $('.priorizar_senha').click(function(e){
                        e.preventDefault();
                        var senha           = $(this).data('senha');
                        var atend           = $(this).attr('id')
                        var set_priorizar   = $(this).data('set_priorizar');
                        var formData = {
                            idAtendimento   : atend,
                            idUsuario       : currentUser.usuarioID,
                            token           : currentUser.emissorToken,
                            priorizar       : set_priorizar
                        };
                        $.ajax({
                            type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                            url			: ATENDIMENTO+'priorizarSenha'+suffix, // the url where we want to POST
                            contentType : 'application/json',
                            data		: JSON.stringify(formData), // our data object
                            dataType	: 'json', // what type of data do we expect back from the server
                            encode		: true
                        }).done(function(data) {
                            if(data.retorno == true){
                              if(data.priorizar == true){
                                showMessage('Senha '+senha+' foi priorizada com sucesso!')
                                $('#senha'+senha+' .stt_priorizar').html('<a data-set_priorizar="false" data-senha="'+senha+'" class="priorizar_senha" id="'+idAtendimento+'" href="#"><i class="fas fa-check-circle"></i></a>');//<i class="fas fa-check-circle"></i>
                              }else{
                                showMessage('Senha '+senha+' foi despriorizada com sucesso!')
                                $('#senha'+senha+' .stt_priorizar').html('<a data-set_priorizar="true" data-senha="'+senha+'" class="priorizar_senha" id="'+idAtendimento+'" href="#"><i class="fas fa-times-circle"></i></a>');//<i class="fas fa-times-circle"></i>
                              }
                            }
                        });
                    });
                }, $('.modal').fadeIn());
            });
            $('.list_monitor').hideLoading();
        });
    });
}

function reloadCategoriasList(){
    var catAtuais;
    var date = new Date();
    print('monitoramento Categoria atualizado: '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds());
    var formData = {};
    $('.list_monitor').showLoading();
    $.ajax({
        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
        url			: UTIL+'getMonitoramentoCategoria'+suffix, // the url where we want to POST
        contentType : 'application/json',
        data		: JSON.stringify(formData), // our data object
        dataType	: 'json', // what type of data do we expect back from the server
        encode		: true
    }).done(function(data) {
        if(data){
            catAtuais = data;
            $.each(catAtuais, function() {
                $.each(this, function(k, v) {
                    var cor_item = '';
                    var bg_verde    = false;
                    var bg_amarelo  = false;
                    var bg_vermelho = false;
                    $.each(v.senhaEmAberto, function(k, v2) {
                        var meta    = (v2.porcMeta/v.metaDia)*100;
                        meta = parseFloat(Math.round(meta * 100) / 100).toFixed(2);
                        if(meta >= v.minVermelho){
                          bg_vermelho = true;
                        }else if(meta >= v.minAmarelo){
                          bg_amarelo = true;
                        }else{
                          bg_verde = true;
                        }
                    });

                    if(bg_verde == true){
                      cor_item = 'bg_verde';
                    }
                    if(bg_amarelo == true){
                      cor_item = 'bg_amarelo';
                    }
                    if(bg_vermelho == true){
                      cor_item = 'bg_vermelho';
                    }
                    $('#categoria'+v.idCategoria+' .totalSenhaEmAberto').text(v.totalSenhaEmAberto);
                    $('#categoria'+v.idCategoria+' .status').html('<span class="bolinha '+cor_item+'"></span>');
                });
            });
        }
        $('.view_fila_detalhe').click(function(e){
            e.preventDefault();
            var id = $(this).data('id');
            $('.modal .modal_content').load('modal/monitor-fila.html', function(){
                var aCategoria = catAtuais.categorias[id];
                $('#fila_nomeCategoria').text(aCategoria.nomeCategoria);
                $('#fila_tempoMedioEspera').text(aCategoria.tempoMedioEspera);
                $('#fila_metaDia').text((aCategoria.metaDia/60)+' MIN.');
                $('#fila_minAmarelo').text(aCategoria.minAmarelo);
                $('#fila_minVermelho').text(aCategoria.minVermelho);

                var senha_list = '<tr><th>SENHA</th><th>DT IMPRESSÃO</th><th>ESPERA</th><th>META %</th><th>CANCELAR</th><th>PRIORIZADO</th></tr>';
                for(var f = 0; f<catAtuais.categorias[id].senhaEmAberto.length; f++){
                    var oItem = catAtuais.categorias[id].senhaEmAberto[f];
                    var priorizar = oItem.priorizado == true ?
                      '<a data-priorizado="false" data-id_atendimento="'+oItem.idAtendimento+'" class="priorizar_senha" id="'+oItem.idAtendimento+'" href="#"><i class="fas fa-check-circle"></i></a>' :
                      '<a data-priorizado="true" data-id_atendimento="'+oItem.idAtendimento+'" class="priorizar_senha" id="'+oItem.idAtendimento+'" href="#"><i class="fas fa-times-circle"></i></a>';
                    var espera  = oItem.tempoEspera ? oItem.tempoEspera : 'N/A';
                    var meta    = (oItem.porcMeta/aCategoria.metaDia)*100;
                    meta = parseFloat(Math.round(meta * 100) / 100).toFixed(2);
                    var cor = '';
                    if(meta>=aCategoria.minVermelho){
                      cor = 'bg_vermelho';
                    }else if(meta>=aCategoria.minAmarelo){
                      cor = 'bg_amarelo';
                    }else{
                      cor = 'bg_verde';
                    }
                    senha_list += '<tr id="senha'+oItem.idAtendimento+'"><td><span class="bolinha '+cor+'"></span>'+oItem.senha+'</td><td>'+oItem.dtImpressao+'</td><td>'+espera+'</td><td>'+meta+'</td><td><a data-id="'+oItem.idAtendimento+'" class="cancelar_senha" href=""><i class="fas fa-times-circle"></i></a></td><td>'+priorizar+'</td></tr>';
                }
                $('.list_monitor_fila').html(senha_list);
                $('.cancelar_senha').click(function(e){
                    e.preventDefault();
                    var senha = $(this).data('id');
                    var formData = {
                        'idUsuario'         : currentUser.usuarioID,
                        'token'             : currentUser.emissorToken,
                        'idAtendimento'     : senha
                    };
                    $.ajax({
                        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                        url			: ATENDIMENTO+'cancelarSenha'+suffix, // the url where we want to POST
                        contentType : 'application/json',
                        data		: JSON.stringify(formData), // our data object
                        dataType	: 'json', // what type of data do we expect back from the server
                        encode		: true
                    }).done(function(data) {
                        if(data.retorno == true){
                          showMessage('Senha '+data.idAtendimento+' cancelada com sucesso');
                          $('#senha'+data.idAtendimento).css({'display':'none'});
                        }
                    });
                });
                $('.priorizar_senha').click(function(e){
                    e.preventDefault();
                    var id_atendimento  = $(this).data('id_atendimento');
                    var priorizado      = $(this).data('priorizado');
                    var formData = {
                        idAtendimento   : id_atendimento,
                        idUsuario       : currentUser.usuarioID,
                        token           : currentUser.emissorToken,
                        priorizar       : priorizado
                    };

                    // SERVIÇO DE PRIORIZAR SENHA NO MONITORAMENTO DE CATEGORIA
                    $.ajax({
                        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                        url			: ATENDIMENTO+'priorizarSenha'+suffix, // the url where we want to POST
                        contentType : 'application/json',
                        data		: JSON.stringify(formData), // our data object
                        dataType	: 'json', // what type of data do we expect back from the server
                        encode		: true
                    }).done(function(data) {
                        if(data.retorno == true){
                            if(data.priorizar == true){
                              showMessage('Senha '+id_atendimento+' foi priorizada com sucesso!')
                              $('#'+id_atendimento).html('<i class="fas fa-check-circle"></i>');
                            }else{
                              showMessage('Senha '+id_atendimento+' foi despriorizada com sucesso!')
                              $('#'+id_atendimento).html('<i class="fas fa-times-circle"></i>');
                            }
                        }
                    });
                });
            }, $('.modal').fadeIn());
        });
        $('.list_monitor').hideLoading();
    });
}

// FUNCçÃO DE MONITORAR HISTÓRICO DE SENHAS
function getMonitoramentoSenhas(){
    contagemCaixasStop();
    contagemCategoriasStop();
    $('#main .main_content').load('content/monitor-senhas.html', function(){
        $('.list_monitor_senhas').showLoading();
        $('.view_categorias_filas').click(function(e){
            e.preventDefault();
            $('.list_monitor_senhas, .list_monitor_caixas').hideLoading();
            getMonitoramentoCategoria();
            contagemCategoriasStart();
        });

        $('.view_historico_senhas').click(function(e){
            e.preventDefault();
            $('.list_monitor, .list_monitor_caixas').hideLoading();
        });

        $('.view_historico_caixas').click(function(e){
            e.preventDefault();
            $('.list_monitor, .list_monitor_senhas').hideLoading();
            getMonitoramentoCaixas();
            contagemCaixasStart();
        });

        $('.bt_Export').click(function(e){
            e.preventDefault();
        });
        reloadSenhasList();
    });
}

// UPDATE DE HISTORICO DE SENHAS
function reloadSenhasList(){
    var date = new Date();
    print('monitoramento Senhas atualizado: '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds());
    var formData = {};
    $('#monitor_senhas_data').text(hoje);

    // SERVIÇO QUE TRAS O HISTORICO DE SENHAS
    $.ajax({
        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
        url			: UTIL+'buscaMonitoramentoSenhas'+suffix, // the url where we want to POST
        contentType : 'application/json',
        data		: JSON.stringify(formData), // our data object
        dataType	: 'json', // what type of data do we expect back from the server
        encode		: true
    }).done(function(data) {
        var item = '';
        if(data){
            $.each(data, function() {
                $.each(this, function(k, v) {
                    var meta = (v.porcentagemMeta/v.categoria.metaDia)*100;
                    meta     = parseFloat(Math.round(meta * 100) / 100).toFixed(2);
                    var priorizada = v.flgPriorizada == true ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-times-circle"></i>';
                    item += '<tr><td>'+v.senha+'</td><td>'+v.dtImpressao+'</td><td>'+v.dtInicioAtendimento+'</td><td>'+v.dtFim+'</td><td>'+v.tme+'</td><td>'+v.tma+'</td><td>'+v.terminalPosicao+'</td><td>'+v.nomeUsuario+'</td><td>'+meta+'</td><td>'+v.status+'</td><td>'+priorizada+'</td></tr>';
                });
            });
        }
        $('.list_monitor_senhas tbody').html(item);
        $('.list_monitor_senhas').hideLoading();
    });
}

// FUNÇÃO QUE TRABALHA O HISTORICO DE CAIXAS
function getMonitoramentoCaixas(){
    contagemSenhasStop();
    contagemCategoriasStop();
    $('#main .main_content').load('content/monitor-caixas.html', function(){
        $('.list_monitor_caixas').showLoading();
        $('.view_categorias_filas').click(function(e){
            e.preventDefault();
            $('.list_monitor_senhas, .list_monitor_caixas').hideLoading();
            getMonitoramentoCategoria();
            contagemCategoriasStart();
        });

        $('.view_historico_senhas').click(function(e){
            e.preventDefault();
            $('.list_monitor, .list_monitor_caixas').hideLoading();
            getMonitoramentoSenhas();
            contagemSenhasStart();
        });

        $('.view_historico_caixas').click(function(e){
            e.preventDefault();
            $('.list_monitor, .list_monitor_senhas').hideLoading();
        });

        $('.bt_Export').click(function(e){
            e.preventDefault();
        });
        reloadCaixasList();
    });
}

// SERVIÇO DE UPDATE DO HISTORICO DE CAIXAS
function reloadCaixasList(){
    var date = new Date();
    print('monitoramento Caixas atualizado: '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds());
    var formData = {};
    $('#monitor_caixas_data').text(hoje);

    // SERVIÇO QUE TRAZ O HISTORICO DE CAIXAS
    $.ajax({
        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
        url			: UTIL+'buscaMonitoramentoCaixa'+suffix, // the url where we want to POST
        contentType : 'application/json',
        data		: JSON.stringify(formData), // our data object
        dataType	: 'json', // what type of data do we expect back from the server
        encode		: true
    }).done(function(data) {
        var item = '';
        if(data){
            $.each(data, function() {
                $.each(this, function(k, v) {
                    var usuario = v.usuario ? v.usuario : 'N/A';
                    var dtLogin = v.dtLogin ? v.dtLogin : 'N/A';
                    var senhaAtual = v.senhaAtual ? v.senhaAtual : 'N/A';
                    var nomeCategoria = v.nomeCategoria ? v.nomeCategoria : 'N/A';
                    item += '<tr><td>'+usuario+'</td><td>'+dtLogin+'</td><td>'+senhaAtual+'</td><td>'+nomeCategoria+'</td><td>'+v.tmpAtdtAtual+'</td><td>'+v.tma+'</td><td>'+v.qtdeAtdt+'</td><td>'+v.politicaFormatada+'</td><td>'+v.tmpOcioso+'</td></tr>';
                });
            });
        }
        $('.list_monitor_caixas tbody').html(item);
        $('.list_monitor_caixas').hideLoading();
    });
}

// MONTA A TELA DE CONFIGURAÇÕES
function loadConfiguracoes(){
    showBarsMenu();
    $('#footer').css({'display':'none'});
    contagemBuscaStop();
    contagemCategoriasStop();
    contagemSenhasStop();
    contagemCaixasStop();
    getAgencia();
}

function getAgencia(){
    $('#main .main_content').load('content/configuracoes-agencia.html', function(){
        $('#bt_cnf_agencia').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_categorias, #cnf_lista_terminais, #cnf_lista_paineis').hideLoading();
            getAgencia();
        });

        $('#bt_cnf_usuarios').click(function(e){
            e.preventDefault();
            $('#cnf_lista_categorias, #cnf_lista_terminais, #cnf_lista_paineis').hideLoading();
            getUsuarios();
        });

        $('#bt_cnf_categorias').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_terminais, #cnf_lista_paineis').hideLoading();
            getCategorias();
        });

        $('#bt_cnf_terminais').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_categorias, #cnf_lista_paineis').hideLoading();
            getTerminais();
        });

        $('#bt_cnf_paineis').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_categorias, #cnf_lista_terminais').hideLoading();
            getPaineis();
        });

        var formData = {};
        // SERVIÇO QUE TRAZ AS INFORMAÇÔE DA AGENCIA
        $.ajax({
            type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
            url			: AGENCIA+'getAgencia'+suffix, // the url where we want to POST
            contentType : 'application/json',
            data		: JSON.stringify(formData), // our data object
            dataType	: 'json', // what type of data do we expect back from the server
            encode		: true
        }).done(function(data) {
            $('#ag_codigo').text(data.idAgencia);
            $('#ag_nome').text(data.nomeAgencia);
            $('#ag_responsavel').text(data.nomeResponsavel);
            $('#ag_email').text(data.emailResponsavel);
            $('#ag_telefone').text(data.foneResponsavel);
            $('#user_codigo').text(currentUser.usuarioID);
            $('#user_nome').text(currentUser.usuarioNome);
            $('#user_matricula').text(currentUser.usuarioID);
            $('#user_ip').text('N/A');
            $('#user_rede').text('N/A');
        });
    });
}

// ADICIONA PAINEL SELECIONADO
function addPainel(painel){
    $(painel).appendTo("#showPaineis");
    var id = $(painel).data('id');
    var n = 0;
    for(var i=0; i<4; i++){
        n = i+1;
        if($('#idPainel'+n).val() == 0){
          $('#idPainel'+n).val(id);
          return;
        }
    }
}

// REMOVER PAINEL SELECIONADO
function removePainel(painel){
    $(painel).appendTo(".paineis_disponiveis");
    var id = $(painel).data('id');
    var n = 0;
    var ativos = [];
    for(var r=0; r<4; r++){
        n = r+1;
        if(($('#idPainel'+n).val() != 0) && ($('#idPainel'+n).val() != id)){
            ativos.push($('#idPainel'+n).val());
        }
    }

    // Adiciono reordenado
    n = 0;
    for(var d=0; d<4; d++){
      n = d+1;
      $('#idPainel'+n).val('0');
    }

    n = 0;
    for(var a=0; a<ativos.length; a++){
        n = a+1;
        $('#idPainel'+n).val(ativos[a]);
    }

}

// MONTA A LISTA DE USUARIOS
function getUsuarios(){
    $('#main .main_content').load('content/configuracoes-usuarios.html', function(){
        $('#cnf_lista_usuarios').showLoading();
        $('#bt_cnf_agencia').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_categorias, #cnf_lista_terminais, #cnf_lista_paineis').hideLoading();
            getAgencia();
        });

        $('#bt_cnf_usuarios').click(function(e){
            e.preventDefault();
            $('#cnf_lista_categorias, #cnf_lista_terminais, #cnf_lista_paineis').hideLoading();
            getUsuarios();
        });

        $('#bt_cnf_categorias').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_terminais, #cnf_lista_paineis').hideLoading();
            getCategorias();
        });

        $('#bt_cnf_terminais').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_categorias, #cnf_lista_paineis').hideLoading();
            getTerminais();
        });

        $('#bt_cnf_paineis').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_categorias, #cnf_lista_terminais').hideLoading();
            getPaineis();
        });

        var formData = {};

        // SERVIÇO QUE TRAZ OS USUARIOS DA BASE
        $.ajax({
            type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
            url			: UTIL+'buscaUsuarios'+suffix, // the url where we want to POST
            contentType : 'application/json',
            data		: JSON.stringify(formData), // our data object
            dataType	: 'json', // what type of data do we expect back from the server
            encode		: true
        }).done(function(data) {
            var linhas = "";
            for(var i=0; i<data.usuarios.length; i++){
                var usuario = data.usuarios[i];
                var status  = usuario.habilitado?'Ativo':'Inativo';
                linhas += "<tr><td class='align_left'>"+usuario.nome+"</td><td>"+usuario.idUsuario+"</td><td>"+usuario.tipoUsuario+"</td><td>"+status+"</td><td><a class='edit' data-data='"+JSON.stringify(usuario)+"' href=''><i class='fas fa-edit'></i></a></td></tr>";
            }
            $('#cnf_lista_usuarios').hideLoading();
            $('#cnf_lista_usuarios tbody').html(linhas);

            // BOTÃO DE EDITAR
            $('.edit').click(function(e){
                e.preventDefault();
                var data    = $(this).data('data');
                $('.modal .modal_content').load('modal/crud-usuarios.html', function(){
                    // Varre data para popular campos para edição
                    if (typeof data != undefined) {
                        $.each(data, function(k, v) {
                            $('#'+k).val(v.toString());
                        });
                    }

                    $('#cancelar').click(function(e){
                        e.preventDefault();
                        closeModal();
                    });

                    $('form').submit(function(e){
                        e.preventDefault();

                        var formData = {
                            "usuarioResponsavelId" : currentUser.usuarioID,
                            "flgHabilitado"     : $('#habilitado option:selected').val(),
                            "fone"              : $('#telefone').val(),
                            "emailUsuario"      : $('#email').val(),
                            "nomeUsuario"       : $('#nome').val(),
                            "idUsuario"         : $('#idUsuario').val(),
                            "matricula"         : $('#matricula').val(),
                            "perfil":{
                              "codPerfilUnidade"  : $('#idTipoUsuario').val(),
                              "descr"             : $('#idTipoUsuario option:selected').text()
                            }
                        };

                        //ENVIAR DADOS DO USUARIO QUE FOI EDITADO
                        $.ajax({
                            type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                            url			: UTIL+'crudUsuario'+suffix, // the url where we want to POST
                            contentType : 'application/json',
                            data		: JSON.stringify(formData), // our data object
                            dataType	: 'json', // what type of data do we expect back from the server
                            encode		: true
                        }).done(function(data) {
                            if(data.status == true){
                              closeModal();
                              getUsuarios();
                            }else{
                              showMessage(data.msg);
                            }
                        });
                    });
                }, $('.modal').fadeIn());
            });

            // BOTAO DE ADICIONAR NOVO USUARIO
            $('.add_btn a').click(function(e){
                e.preventDefault();
                $('.modal .modal_content').load('modal/crud-usuarios.html', function(){
                    $('#cancelar').click(function(e){
                        e.preventDefault();
                        closeModal();
                    });

                    $('form').submit(function(e){
                        e.preventDefault();
                        var formData = {
                            "usuarioResponsavelId" : currentUser.usuarioID,
                            "flgHabilitado"     : $('#habilitado option:selected').val(),
                            "fone"              : $('#telefone').val(),
                            "emailUsuario"      : $('#email').val(),
                            "nomeUsuario"       : $('#nome').val(),
                            "idUsuario"         : 0,
                            "matricula"         : $('#matricula').val(),
                            "perfil":{
                                "codPerfilUnidade":$('#idTipoUsuario').val(),
                                "descr":$('#idTipoUsuario option:selected').text()
                            }
                        };

                        // ENVIAR DADOS DO USUARIO ADICIONADO
                        $.ajax({
                            type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                            url			: UTIL+'crudUsuario'+suffix, // the url where we want to POST
                            contentType : 'application/json',
                            data		: JSON.stringify(formData), // our data object
                            dataType	: 'json', // what type of data do we expect back from the server
                            encode		: true
                        }).done(function(data) {
                            if(data.status == true){
                              closeModal();
                              getUsuarios();
                            }else{
                              showMessage(data.msg);
                            }
                        });
                    });
                }, $('.modal').fadeIn());
            });
        });
    });
}

// MONTA A LISTA DE CATEGORIAS
function getCategorias(){
    $('#main .main_content').load('content/configuracoes-categorias.html', function(){
        $('#cnf_lista_categorias').showLoading();
        $('#bt_cnf_agencia').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_categorias, #cnf_lista_terminais, #cnf_lista_paineis').hideLoading();
            getAgencia();
        });

        $('#bt_cnf_usuarios').click(function(e){
            e.preventDefault();
            $('#cnf_lista_categorias, #cnf_lista_terminais, #cnf_lista_paineis').hideLoading();
            getUsuarios();
        });

        $('#bt_cnf_categorias').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_terminais, #cnf_lista_paineis').hideLoading();
            getCategorias();
        });

        $('#bt_cnf_terminais').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_categorias, #cnf_lista_paineis').hideLoading();
            getTerminais();
        });

        $('#bt_cnf_paineis').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_categorias, #cnf_lista_terminais').hideLoading();
            getPaineis();
        });

        var formData = {};

        //TRAS A LISTA DE CATEGORIAS DA BASE
        $.ajax({
            type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
            url			: UTIL+'buscaCategorias'+suffix, // the url where we want to POST
            contentType : 'application/json',
            data		: JSON.stringify(formData), // our data object
            dataType	: 'json', // what type of data do we expect back from the server
            encode		: true
        }).done(function(data) {
            var linhas = "";
            for(var i=0; i<data.categoria.length; i++){
                var cat = data.categoria[i];
                linhas += "<tr><td class='align_left'>"+cat.nomeCategoria+"</td><td>"+cat.tipoCategoria+"</td><td>"+cat.minAmarelo+"</td><td>"+cat.minVermelho+"</td><td><a class='edit' data-data='"+JSON.stringify(cat)+"' href=''><i class='fas fa-edit'></i></a></td></tr>";
            }
            $('#cnf_lista_categorias').hideLoading();
            $('#cnf_lista_categorias tbody').html(linhas);

            //BOTAO DE EDITAR
            $('.edit').click(function(e){
                e.preventDefault();
                var data    = $(this).data('data');
                $('.modal .modal_content').load('modal/crud-categorias.html', function(){
                    var paineisAtivos = [];

                    // Varre data para popular campos para edição
                    if (typeof data != undefined) {
                        $.each(data, function(k, v) {
                            $('#'+k).val(v);
                            if(v === true){
                              $("#"+k).prop( "checked", true );
                            }else if(v === false){
                              $("#"+k).prop( "checked", false );
                            }
                            if(k=='metaDia'){
                              $('#'+k).val(v/60);
                            }
                            if(k=='paineis'){
                              $.each(v, function(k, v) {
                                  paineisAtivos.push(v.id);
                              });
                            }
                        });
                    }

                    // Lista Painéis disponíveis quando crud = categoria
                    $.ajax({
                        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                        url			: UTIL+'buscaPaineis'+suffix, // the url where we want to POST
                        contentType : 'application/json',
                        data		: '', // our data object
                        dataType	: 'json', // what type of data do we expect back from the server
                        encode		: true
                    }).done(function(data) {
                        var paineis_disponiveis = '';
                        if (typeof data != undefined && data.display.length > 0) {
                            for(var i=0; i<data.display.length; i++){
                                var painel  = data.display[i];
                                paineis_disponiveis += '<div id="painel'+painel.id+'" class="bt_painel" data-id="'+painel.id+'"><a title="'+painel.id+'" href="#">'+painel.hostname+'</a></div>';
                            }
                        }
                        $('.paineis_disponiveis').html(paineis_disponiveis);

                        // Adicionar função pra jogar painéis já existentes no
                        for(var pa = 0; pa<paineisAtivos.length; pa++){
                          addPainel($('#painel'+paineisAtivos[pa]));
                        }

                        $('.paineis_disponiveis').click('.bt_painel', function(e){
                            e.preventDefault();
                            addPainel(this);
                        });
                        $('#showPaineis').click('.bt_painel', function(e){
                            e.preventDefault();
                            removePainel(this);
                        });
                    });

                    $('#cancelar').click(function(e){
                        e.preventDefault();
                        closeModal();
                    });

                    $('form').submit(function(e){
                        e.preventDefault();
                        var formData = {
                            "nomeFila"          : $('#nomeCategoria').val(),
                            "senhaIni"          : $('#rangeInicial').val(),
                            "senhaFim"          : $('#rangeFinal').val(),
                            "tminAmarelo"       : $('#minAmarelo').val(),
                            "tminVermelho"      : $('#minVermelho').val(),
                            "tmeMetaDia"        : $('#metaDia').val()*60,
                            "idPainel1"         : $('#idPainel1').val(),
                            "idPainel2"         : $('#idPainel2').val(),
                            "idPainel3"         : $('#idPainel3').val(),
                            "idPainel4"         : $('#idPainel4').val(),
                            "identificacao"     : $('#tipoCategoria').val(),
                            "tipoFila"          : $('#tipoCategoria').val(),
                            "idCategoria"       : $('#idCategoria').val(),
                            "idLocalAtendimento": $('#idLocalAtendimento').val(),
                            "flgIsCliente"      : true,
                            "flgIdentificacao"  : true,
                            "idNivelSegmento"   : 1,
                            "incrementalSenha"  : 1,
                            "porcentagemExclusaoAtendimento"    : 0,
                            "idUsuarioResponsavel"              : currentUser.usuarioID
                        };

                        //ENVIA DADOS DA CATEGORIA EDITADA
                        $.ajax({
                            type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                            url			: UTIL+'updateCategoria'+suffix, // the url where we want to POST
                            contentType : 'application/json',
                            data		: JSON.stringify(formData), // our data object
                            dataType	: 'json', // what type of data do we expect back from the server
                            encode		: true
                        }).done(function(data) {
                            if(data.status == true){
                                closeModal();
                                getCategorias();
                            }
                        });
                    });
                }, $('.modal').fadeIn());
            });
        });
    });
}

// MONTA A LISTA DE TERMINAIS
function getTerminais(){
    $('#main .main_content').load('content/configuracoes-terminais.html', function(){
        $('#cnf_lista_terminais').showLoading();
        $('#bt_cnf_agencia').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_categorias, #cnf_lista_terminais, #cnf_lista_paineis').hideLoading();
            getAgencia();
        });

        $('#bt_cnf_usuarios').click(function(e){
            e.preventDefault();
            $('#cnf_lista_categorias, #cnf_lista_terminais, #cnf_lista_paineis').hideLoading();
            getUsuarios();
        });

        $('#bt_cnf_categorias').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_terminais, #cnf_lista_paineis').hideLoading();
            getCategorias();
        });

        $('#bt_cnf_terminais').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_categorias, #cnf_lista_paineis').hideLoading();
            getTerminais();
        });

        $('#bt_cnf_paineis').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_categorias, #cnf_lista_terminais').hideLoading();
            getPaineis();
        });

        // SERVIÇO QUE TRAZ A LISTA DE TERMINAIS/CAIXAS
        var formData = {};
        $.ajax({
            type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
            url			: UTIL+'buscaCaixas'+suffix, // the url where we want to POST
            contentType : 'application/json',
            data		: JSON.stringify(formData), // our data object
            dataType	: 'json', // what type of data do we expect back from the server
            encode		: true
        }).done(function(data) {
            var linhas = "";
            for(var i=0; i<data.caixa.length; i++){
                var terminal = data.caixa[i];
                var status = terminal.isLogado ? 'Sim' : 'Não';
                linhas += "<tr><td class='align_left'>"+terminal.aliasCaixa+"</td><td>"+terminal.hostname+"</td><td>"+terminal.tipoCaixa+"</td><td>"+status+"</td><td><a class='edit' data-data='"+JSON.stringify(terminal)+"' href='#'><i class='fas fa-edit'></i></a></td></tr>";
            }
            $('#cnf_lista_terminais').hideLoading();
            $('#cnf_lista_terminais tbody').html(linhas);

            // EDITAR TERMINAIS
            $('.edit').click(function(e){
                e.preventDefault();
                var data    = $(this).data('data');
                $('.modal .modal_content').load('modal/crud-terminais.html', function(){
                    var tipoCx = '';
                    // Varre data para popular campos para edição
                    if (typeof data != undefined) {
                        $.each(data, function(k, v) {
                            $('#'+k).val(v);
                            if(v === true){
                                $("#"+k).val("Sim");
                            }else if(v === false){
                                $("#"+k).val("Não");
                            }
                            if(k === 'tipoCaixa'){
                                tipoCx = data.tipoCaixa
                            }
                            if(k === 'politicaFormatada'){
                                var quebraPolitica = v.split('');
                                var colcA = '<button class="tool_item bt_colcheteAbre abreColchete" disabled>[</button>';
                                var colcF = '<button class="tool_item bt_colcheteFecha fechaColchete" disabled>]</button>';
                                var chavA = '<button class="tool_item bt_chaveAbre abreChave" disabled>{</button>';
                                var chavF = '<button class="tool_item bt_chaveFecha fechaChave" disabled>}</button>';
                                var barra = '<button class="tool_item bt_barra barra" disabled>/</button>';
                                var excla = '<button class="tool_item bt_exclamacao exclamacao" disabled>!</button>';

                                for(var p = 0; p<quebraPolitica.length; p++){
                                    var carac = quebraPolitica[p];
                                    var letra = '<button disabled>'+carac+'</button>';
                                    if(carac == '/'){
                                      addElement(barra);
                                    }else if(carac == '!'){
                                      addElement(excla);
                                    }else if(carac == '['){
                                      addElement(colcA);
                                    }else if(carac == ']'){
                                      addElement(colcF);
                                    }else if(carac == '{'){
                                      addElement(chavA);
                                    }else if(carac == '}'){
                                      addElement(chavF);
                                    }else{
                                      addElement(letra);
                                    }
                                }
                            }
                        });
                    }

                    $('#cancelar').click(function(e){
                        e.preventDefault();
                        closeModal();
                    });

                    // MONTA SELECT COM OS TIPOS DE POSIÇÃO
                    var listaCxPosicao = '';
                    $.ajax({
                        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                        url			: UTIL+'buscaTipoCaixaPosicao'+suffix, // the url where we want to POST
                        contentType : 'application/json',
                        data		: JSON.stringify(formData), // our data object
                        dataType	: 'json', // what type of data do we expect back from the server
                        encode		: true
                    }).done(function(data) {
                        for(var p = 0; p<data.tipoCaixaPosicao.length; p++){
                          var posicao = data.tipoCaixaPosicao[p];
                          listaCxPosicao += '<option value="'+posicao.descricaotipoPosicao+'">'+posicao.descricaotipoPosicao+'</option>';
                        }
                        $('#tipoCaixa').html(listaCxPosicao);
                        $('#tipoCaixa').val(tipoCx);
                    });

                    // USA O SERVIÇO DE TRAZER AS CATEGORIAS PARA MONTAR OS BOTÕES DE CONFIGURAÇÃO DA POLITICA
                    $.ajax({
                        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                        url			: UTIL+'buscaCategorias'+suffix, // the url where we want to POST
                        contentType : 'application/json',
                        data		: JSON.stringify(formData), // our data object
                        dataType	: 'json', // what type of data do we expect back from the server
                        encode		: true
                    }).done(function(data) {
                        if(data){
                            var LETRAS = '';
                            var listaLetras = '';
                            for(var l = 0; l<data.categoria.length; l++){
                              LETRAS = data.categoria[l];
                              listaLetras += '<button>'+$.trim(LETRAS.tipoCategoria)+'</button>';// data-id="'+LETRAS.idCategoria+'"
                            }
                            $('#teclado_letras').html(listaLetras);
                            var TOOLS = '<button class="tool_item bt_colcheteAbre abreColchete">[</button><button class="tool_item bt_colcheteFecha fechaColchete" disabled>]</button><button class="tool_item bt_chaveAbre abreChave">{</button><button class="tool_item bt_chaveFecha fechaChave" disabled>}</button><button class="tool_item bt_barra barra">/</button><button class="tool_item bt_exclamacao exclamacao">!</button><button class="tool_item bt_asterisco asterisco">*</button>';
                            $('#teclado_tools').html(TOOLS);
                            $('.barra').click(function(e){
                                e.preventDefault();
                                addElement(this);
                            });

                            $('.exclamacao').click(function(e){
                                e.preventDefault();
                                addElement(this);
                            });

                            $('.abreColchete').click(function(e){
                                e.preventDefault();
                                addElement(this);
                            });

                            $('.fechaColchete').click(function(e){
                                e.preventDefault();
                                addElement(this);
                            });

                            $('.abreChave').click(function(e){
                                e.preventDefault();
                                addElement(this);
                            });

                            $('.fechaChave').click(function(e){
                                e.preventDefault();
                                addElement(this);
                            });

                            $('#teclado_letras button').click(function(e){
                                e.preventDefault();
                                addElement(this);
                            });

                            $('.limparUltimo').click(function(e){
                                e.preventDefault();
                                removeElement();
                            });
                        }
                    });
                    $('#showPolitica button').click(function(e){
                        e.preventDefault();
                    });

                    $('form').submit(function(e){
                        e.preventDefault();
                        if($('#tipoCaixa option:selected').val() === 'NA'){
                          showMessage('Tipo da Posição não pode ser NA');
                        }else{
                            // VERIFICA A POLITICA MONTADA
                            if(verificaPolitica()){
                                // ENVIAR DADOS DO TERMINAL CONFIGURADO
                                var formData = {
                                    "hostname"              : $('#hostname').val(),
                                    "politicaAtend"         : $('#showPolitica button').text(),
                                    "tipoCaixa"             : $('#tipoCaixa option:selected').val(),
                                    "aliasCaixa"            : $('#aliasCaixa').val(),
                                    "flgHabilitado"         : true,
                                    "usuarioResponsavelId"  : currentUser.usuarioID
                                };

                                $.ajax({
                                    type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                                    url			: UTIL+'crudCaixa'+suffix, // the url where we want to POST
                                    contentType : 'application/json',
                                    data		: JSON.stringify(formData), // our data object
                                    dataType	: 'json', // what type of data do we expect back from the server
                                    encode		: true
                                }).done(function(data) {
                                    console.log('CRUDCAIXAS', data);
                                    if(data.status == true){
                                        closeModal();
                                        showMessage(data.msg);
                                        getTerminais();
                                    }else{
                                        showMessage(data.error);
                                    }
                                });
                            }else{
                                showMessage('Política mal formatada. Verifique e tente novamente.');
                            }
                        }
                    });
                }, $('.modal').fadeIn());
            });

            // ADICIONAR UM TERMINAL/CAIXA
            $('.add_btn a').click(function(e){
                e.preventDefault();
                $('.modal .modal_content').load('modal/crud-terminais.html', function(){
                    $('#cancelar').click(function(e){
                        e.preventDefault();
                        closeModal();
                    });

                    // TRAZ A LISTA DO TIPO DE POSIÇÃO PARA O CAIXA
                    var listaCxPosicao = '';
                    $.ajax({
                        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                        url			: UTIL+'buscaTipoCaixaPosicao'+suffix, // the url where we want to POST
                        contentType : 'application/json',
                        data		: JSON.stringify(formData), // our data object
                        dataType	: 'json', // what type of data do we expect back from the server
                        encode		: true
                    }).done(function(data) {
                        for(var p = 0; p<data.tipoCaixaPosicao.length; p++){
                            var posicao = data.tipoCaixaPosicao[p];
                            listaCxPosicao += '<option value="'+posicao.descricaotipoPosicao+'">'+posicao.descricaotipoPosicao+'</button>';
                        }
                        $('#tipoCaixa').html(listaCxPosicao);
                    });

                    // TRAZ A LISTA DE CATEGORIAS PARA MONTAR O TECLADO
                    $.ajax({
                        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                        url			: UTIL+'buscaCategorias'+suffix, // the url where we want to POST
                        contentType : 'application/json',
                        data		: JSON.stringify(formData), // our data object
                        dataType	: 'json', // what type of data do we expect back from the server
                        encode		: true
                    }).done(function(data) {
                        var LETRAS = '';
                        var listaLetras = '';
                        for(var l = 0; l<data.categoria.length; l++){
                            LETRAS = data.categoria[l];
                            listaLetras += '<button>'+$.trim(LETRAS.tipoCategoria)+'</button>';//data-id="'+LETRAS.idCategoria+'"
                        }
                        $('#teclado_letras').html(listaLetras);
                        var TOOLS = '<button class="tool_item bt_colcheteAbre abreColchete">[</button><button class="tool_item bt_colcheteFecha fechaColchete" disabled>]</button><button class="tool_item bt_chaveAbre abreChave">{</button><button class="tool_item bt_chaveFecha fechaChave" disabled>}</button><button class="tool_item bt_barra barra">/</button><button class="tool_item bt_exclamacao exclamacao">!</button><button class="tool_item bt_asterisco asterisco">*</button>';
                        $('#teclado_tools').html(TOOLS);

                        $('.barra').click(function(e){
                            e.preventDefault();
                            addElement(this);
                        });

                        $('.exclamacao').click(function(e){
                            e.preventDefault();
                            addElement(this);
                        });

                        $('.abreColchete').click(function(e){
                            e.preventDefault();
                            addElement(this);
                        });

                        $('.fechaColchete').click(function(e){
                            e.preventDefault();
                            addElement(this);
                        });

                        $('.abreChave').click(function(e){
                            e.preventDefault();
                            addElement(this);
                        });

                        $('.fechaChave').click(function(e){
                            e.preventDefault();
                            addElement(this);
                        });

                        $('#teclado_letras button').click(function(e){
                            e.preventDefault();
                            addElement(this);
                        });

                        $('.limparUltimo').click(function(e){
                            e.preventDefault();
                            removeElement();
                        });

                    });

                    $('form').submit(function(e){
                        e.preventDefault();
                        if($('#tipoCaixa option:selected').val() === 'NA'){
                            showMessage('Tipo da Posição não pode ser NA');
                        }else{
                            // VERIFICA SE POLITICA FOI CONFIGURADA CORRETAMENTE
                            if(verificaPolitica()){
                                var formData = {
                                    "hostname"              : $('#hostname').val(),
                                    "politicaAtend"         : $('#showPolitica button').text(),
                                    "tipoCaixa"             : $('#tipoCaixa option:selected').val(),
                                    "aliasCaixa"            : $('#aliasCaixa').val(),
                                    "flgHabilitado"         : true,
                                    "usuarioResponsavelId"  : currentUser.usuarioID
                                };
                                // ADICIONA O TERMINAL
                                $.ajax({
                                    type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                                    url			: UTIL+'crudCaixa'+suffix, // the url where we want to POST
                                    contentType : 'application/json',
                                    data		: JSON.stringify(formData), // our data object
                                    dataType	: 'json', // what type of data do we expect back from the server
                                    encode		: true
                                }).done(function(data) {
                                    if(data.status == true){
                                        closeModal();
                                        showMessage(data.msg);
                                        getTerminais();
                                    }else{
                                        showMessage(data.error);
                                    }
                                });
                            }else{
                                showMessage('Política mal formatada. Verifique e tente novamente.');
                            }
                        }
                    });
                }, $('.modal').fadeIn());
            });
        });
    });
}

// ADICIONA NA TAG QUE MOSTRA A POLITICA O ELEMENTO QUE FOI CLICADO
function addElement(elem){
    $(elem).clone().appendTo("#showPolitica");
    $("#showPolitica button").attr("disabled", true);
    // MOSTRA UM X ou UM CHECK INDICADO CONFIGURAÇÃO CORRETA
    if(!verificaPolitica()){
        $('#statusPolitica').html('<i class="fas fa-times-circle"></i>');
    }else{
        $('#statusPolitica').html('<i class="fas fa-check-circle"></i>');
    }
}

// REMOVE DA TAG QUE MOSTRA A POLITICA O ELEMENTO QUE FOI ADICIONADO INCORRETAMENTE
function removeElement(){
    $("#showPolitica button").last().remove();
    if(!verificaPolitica()){
        $('#statusPolitica').html('<i class="fas fa-times-circle"></i>');
    }else{
        $('#statusPolitica').html('<i class="fas fa-check-circle"></i>');
    }
}

// VERIFICA A CONFIGURAÇÃO DA POLITICA
function verificaPolitica(){
    var strAtual = $("#showPolitica button").text();
    if(strAtual.indexOf('/') != -1 || strAtual.indexOf('!') != -1){
      ativarTeclado('bt_barra, bt_exclamacao');
      return true;
    }

    if(strAtual==''){
        ativarTeclado('bt_chaveAbre, bt_colcheteAbre, bt_barra, bt_exclamacao');
        return false;
    }
    var spl = strAtual.split('');

    var colc    = false;
    var chav    = false;
    for(var c=0; c<spl.length; c++){
        var car = spl[c];
        if(car === '['){
          colc = true;
        }else if(car === ']'){
          colc = false;
        }
        if(car === '{'){
          chav = true;
        }else if(car === '}'){
          chav = false;
        }
    }
    if(colc || chav){
        if(spl.length>1){
            var last1 = spl[spl.length-1];
            var last2 = spl[spl.length-2];
            if(chav){
                if(last2.match(/[A-Z]/i) && last1.match(/[A-Z]/i)){
                    ativarTeclado('bt_chaveFecha');
                    return false;
                }else{
                    ativarTeclado('');
                    return false;
                }
            }

            if(colc){
                if(last1.match(/[A-Z]/i) || last1 == '}'){
                    if(!chav){
                        ativarTeclado('bt_chaveAbre, bt_colcheteFecha');
                        return false;
                    }
                }else{
                    if(!chav){
                        ativarTeclado('bt_chaveAbre');
                        return false;
                    }else{
                        ativarTeclado('');
                        return false;
                    }
                }
            }
        }else{
            if(colc){
                ativarTeclado('bt_chaveAbre');
                return false;
            }else if(chav){
                ativarTeclado('');
                return false;
            }else{
                ativarTeclado('bt_chaveAbre, bt_colcheteAbre');
                return false;
            }
        }
    }else{
        ativarTeclado('bt_chaveAbre, bt_colcheteAbre');
    }
    return true;
}

// ATIVA ALGUM BOTÃO DO TECLADO DA POLITICA
function ativarTeclado(botoes){
    // Desativa tudo
    desativarTeclado();
    if(botoes != ''){
        var i = 0;
        var bts = botoes.split(',');
        var qt  = bts.length;
        for(i=0; i<qt; i++){
            var botao = $.trim(bts[i]);
            $('#teclado_tools .'+botao).prop('disabled', false);
        }
    }
}
function desativarTeclado(){
  $('#teclado_tools button').prop('disabled', true);
}

// MONTA A LISTA DE PAINEIS DA BASE
function getPaineis(){
    $('#main .main_content').load('content/configuracoes-paineis.html', function(){
        $('#cnf_lista_paineis').showLoading();
        $('#bt_cnf_agencia').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_categorias, #cnf_lista_terminais, #cnf_lista_paineis').hideLoading();
            getAgencia();
        });

        $('#bt_cnf_usuarios').click(function(e){
            e.preventDefault();
            $('#cnf_lista_categorias, #cnf_lista_terminais, #cnf_lista_paineis').hideLoading();
            getUsuarios();
        });

        $('#bt_cnf_categorias').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_terminais, #cnf_lista_paineis').hideLoading();
            getCategorias();
        });

        $('#bt_cnf_terminais').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_categorias, #cnf_lista_paineis').hideLoading();
            getTerminais();
        });

        $('#bt_cnf_paineis').click(function(e){
            e.preventDefault();
            $('#cnf_lista_usuarios, #cnf_lista_categorias, #cnf_lista_terminais').hideLoading();
            getPaineis();
        });

        // SERVIÇO QUE TRAZ A LISTA DE PAINEIS DA BASE
        var formData = {};
        $.ajax({
            type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
            url			: UTIL+'buscaPaineis'+suffix, // the url where we want to POST
            contentType : 'application/json',
            data		: JSON.stringify(formData), // our data object
            dataType	: 'json', // what type of data do we expect back from the server
            encode		: true
        }).done(function(data) {
            var linhas = "";
            if (data.display.length > 0) {
                for(var i=0; i<data.display.length; i++){
                    var painel      = data.display[i];
                    var status      = painel.isAtivo ? 'Sim' : 'Não';
                    var _hostname   = ((painel.hostname != '') && (painel.hostname != undefined)) ? painel.hostname : 'N/A';
                    var _macAddress = ((painel.macAddress != '') && (painel.macAddress != undefined)) ? painel.macAddress : 'N/A';
                    linhas += "<tr><td class='align_left'>"+painel.id+"</td><td>"+_hostname+"</td><td>"+_macAddress+"</td><td>"+status+"</td><td><a class='edit' data-data='"+JSON.stringify(painel)+"' href=''><i class='fas fa-edit'></i></a></td></tr>";
                }
            }
            $('#cnf_lista_paineis').hideLoading();
            $('#cnf_lista_paineis tbody').html(linhas);

            // EDITAR PAINEL
            $('.edit').click(function(e){
                e.preventDefault();
                var data    = $(this).data('data');
                $('.modal .modal_content').load('modal/crud-paineis.html', function(){
                    var setDisplay = data.tipoDisplay;
                    var listaTipoDisplay = '';
                    $.ajax({
                        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                        url			: UTIL+'buscaTipoDisplay'+suffix, // the url where we want to POST
                        contentType : 'application/json',
                        data		: '', // our data object
                        dataType	: 'json', // what type of data do we expect back from the server
                        encode		: true
                    }).done(function(data) {
                        for(var p = 0; p<data.tipoDisplay.length; p++){
                            var display = data.tipoDisplay[p];
                            listaTipoDisplay += '<option value="'+display.id+'">'+display.descricao+'</option>';
                        }
                        $('#tipoDisplay').html(listaTipoDisplay);
                        $('#tipoDisplay').val(setDisplay);
                    });

                    // Varre data para popular campos para edição
                    if (typeof data != undefined) {
                        $.each(data, function(k, v) {
                            $('#'+k).val(v.toString());
                        });
                    }

                    if($('#hostname').val().length>=1){
                        $('#macAddress').prop("disabled", true);
                    }else if($('#macAddress').val().length>=1){
                        $('#hostname').prop("disabled", true);
                    }

                    $('#hostname').keyup(function(){
                        var len = $(this).val().length;
                        if (len >= 1) {
                            $('#macAddress').prop("disabled", true);
                        }else{
                            $('#macAddress').prop("disabled", false);
                        }
                    });

                    $('#macAddress').keyup(function(){
                        var len = $(this).val().length;
                        if (len >= 1) {
                            $('#hostname').prop("disabled", true);
                        }else{
                            $('#hostname').prop("disabled", false);
                        }
                    });

                    $('#cancelar').click(function(e){
                        e.preventDefault();
                        closeModal();
                    });

                    $('form').submit(function(e){
                        e.preventDefault();

                        var formData = {
                            "hostname"              : $('#hostname').val(),
                            "idPainel"              : $('#id').val(),
                            "macAddress"            : $('#macAddress').val(),
                            "flgHabilitado"         : $('#isAtivo option:selected').val(),
                            "tipoDisplay"           : $('#tipoDisplay option:selected').val(),
                            "usuarioResponsavelId"  : currentUser.usuarioID
                        };

                        //ENVIA OS DADOS DO PAINEL
                        $.ajax({
                            type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                            url			: UTIL+'crudPainel'+suffix, // the url where we want to POST
                            contentType : 'application/json',
                            data		: JSON.stringify(formData), // our data object
                            dataType	: 'json', // what type of data do we expect back from the server
                            encode		: true
                        }).done(function(data) {
                            if(data.status == true){
                                closeModal();
                                getPaineis();
                            }else{
                                showMessage(data.msg);
                            }
                        });
                    });
                }, $('.modal').fadeIn());
            });

            // ADICIONAR UM PAINEL
            $('.add_btn a').click(function(e){
                e.preventDefault();
                $('.modal .modal_content').load('modal/crud-paineis.html', function(){
                    var listaTipoDisplay = '';
                    $.ajax({
                        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                        url			: UTIL+'buscaTipoDisplay'+suffix, // the url where we want to POST
                        contentType : 'application/json',
                        data		: '', // our data object
                        dataType	: 'json', // what type of data do we expect back from the server
                        encode		: true
                    }).done(function(data) {
                        for(var p = 0; p<data.tipoDisplay.length; p++){
                            var display = data.tipoDisplay[p];
                            listaTipoDisplay += '<option value="'+display.id+'">'+display.descricao+'</option>';
                        }
                        $('#tipoDisplay').html(listaTipoDisplay);
                    });

                    $('#hostname').keyup(function(){
                        var len = $(this).val().length;
                        if (len >= 1) {
                            $('#macAddress').prop("disabled", true);
                        }else{
                            $('#macAddress').prop("disabled", false);
                        }
                    });

                    $('#macAddress').keyup(function(){
                        var len = $(this).val().length;
                        if (len >= 1) {
                            $('#hostname').prop("disabled", true);
                        }else{
                            $('#hostname').prop("disabled", false);
                        }
                    });

                    $('#cancelar').click(function(e){
                        e.preventDefault();
                        closeModal();
                    });

                    $('form').submit(function(e){
                        e.preventDefault();
                        var formData = {
                            "hostname"              : $('#hostname').val(),
                            "idPainel"              : $('#id').val(),
                            "macAddress"            : $('#macAddress').val(),
                            "flgHabilitado"         : $('#isAtivo option:selected').val(),
                            "tipoDisplay"           : $('#tipoDisplay option:selected').val(),
                            "usuarioResponsavelId"  : currentUser.usuarioID
                        };

                        // ENVIA OS DADOS DO PAINEL CADASTRADO
                        $.ajax({
                            type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
                            url			: UTIL+'crudPainel'+suffix, // the url where we want to POST
                            contentType : 'application/json',
                            data		: JSON.stringify(formData), // our data object
                            dataType	: 'json', // what type of data do we expect back from the server
                            encode		: true
                        }).done(function(data) {
                            if(data.status == true){
                                closeModal();
                                getPaineis();
                            }else{
                                showMessage(data.msg);
                            }
                        });
                    });
                }, $('.modal').fadeIn());
            });
        });
    });
}

// FUNÇÃO USADA QUANDO CLICA NO ICONE DO MICROFONE
function atendimentoChamarVoz(){
    if(usaLocucao == 'N'){
        usaLocucao = 'S';
        $('#bt_chamar_voz').html('<img src="assets/img/microfone-som.png" alt="">');
    }else{
        usaLocucao = 'N';
        $('#bt_chamar_voz').html('<img src="assets/img/microfone-mudo.png" alt="">');
    }
}

// CHAMAR UMA SENHA
function atendimentoChamar(){
    desativar();
    var formData = {
        "idUsuario"         : currentUser.usuarioID,
        "token"             : currentUser.emissorToken,
        "usaLocucao"        : usaLocucao,
        "crmFidelize"       : true
    };
    $.ajax({
        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
        url			: ATENDIMENTO+'chamarSenha'+suffix, // the url where we want to POST
        contentType : 'application/json',
        data		: JSON.stringify(formData), // our data object
        dataType	: 'json', // what type of data do we expect back from the server
        encode		: true
    }).done(function(data) {
        console.log('chamar', data);
        if(data.idAtendimento != undefined){
            lastAction = 'chamar';
            emAtendimento   = true;
            idAtendimento   = data.idAtendimento;

            $('.info_chamada .n_atendimento_value').html(data.idAtendimento);
            $('.info_chamada .senha_value').html(data.senha);
            $('.info_chamada .data_value').html(data.dtImpressao);
            $('.info_chamada .categoria_value').html(data.nomeCategoria);

            console.log(data.crm.nome_cliente, data.crm.cpf, data.crm.ag, data.crm.cc, data.crm.cnpj);

            if(data.crm === null || data.crm === undefined || data.crm === {} ) {
                $('.info-crm').css({'display':'none'});
            } else {
                if (USAFOTO) {
                    var img = $("<img class='crm-pic' src='"+ BASE_URL + 'utils/imagem/' + data.senha +"'>");
                    $('.info-crm').prepend(img);
                }

                if(data.crm.status === false) {
                    $('#col-nocrm').css({'display':'inherit'});
                    $('#col-nome').css({'display':'none'}); 
                    $('#col-documento').css({'display':'none'});
                    $('#col-correntista').css({'display':'none'});
                    $('#col-segmento').css({'display':'none'});
                    $('#col-ag').css({'display':'none'});
                    $('#col-cc').css({'display':'none'});
                } else {
                    $('#col-nocrm').css({'display':'none'});

                    if (data.crm.nome_cliente !== undefined) {
                        $('.info_chamada .nome_value').html(data.crm.nome_cliente);
                    } else if(data.crm.nome !== undefined) {
                        $('.info_chamada .nome_value').html(data.crm.nome);
                    } else {
                        $('#col-nome').css({'display':'none'});
                    }
        
                    if(data.crm.cpf !== undefined) {
                        $('.info_chamada .documento_nome > strong').text('CPF:');
                        $('.info_chamada .documento_value').html(data.crm.cpf + ' - ( <span class="situacao-'+ data.crm.situacao +'">' + data.crm.situacao + '</span> )');
                    } else if(data.crm.cnpj !== undefined) {
                        $('.info_chamada .documento_nome > strong').text('CNPJ');
                        $('.info_chamada .documento_value').html(data.crm.cnpj);
                    } else {
                        $('#col-documento').css({'display':'none'});
                    }
    
                    if(data.crm.correntista !== undefined) {
                        $('.info_chamada .correntista_nome > strong').text('Correntista: ');
                        $('.info_chamada .correntista_value').html((data.crm.correntista ? 'Sim' : 'Não') + ' - <strong>Consignado:</strong> ' + (data.crm.consignado === 'S' ? 'Sim' : 'Não'));
                    } else {
                        $('#col-correntista').css({'display':'none'});
                    }
    
                    if(data.crm.segmento !== undefined) {
                        $('.info_chamada .segmento_nome > strong').text('Segmento:');
                        $('.info_chamada .segmento_value').html(data.crm.segmento);
                    } else {
                        $('#col-segmento').css({'display':'none'});
                    }
        
                    if(data.crm.ag !== undefined) {
                        $('.info_chamada .ag_value').html(data.crm.ag);
                    } else {
                        $('#col-ag').css({'display':'none'});
                    }
        
                    if(data.crm.cc !== undefined) {
                        $('.info_chamada .cc_value').html(data.crm.ag);
                    } else {
                        $('#col-cc').css({'display':'none'});
                    }
                }
    
                
            }

            /*if(data.crm.nome_cliente != undefined && data.crm.cpf !== undefined || data.crm.cnpj !== undefined && data.crm.ag !== undefined && data.crm.cc !== undefined){
                
                if (USAFOTO) {
                    var img = $("<img class='crm-pic' src='"+ BASE_URL + 'utils/imagem/' + data.senha +"'>");
                    $('.info-crm').prepend(img);
                }

                
                $('.info_chamada .ag_value').html(data.crm.ag);
                $('.info_chamada .cc_value').html(data.crm.cc);

                if(data.crm.cpf !== undefined) {
                  $('.info_chamada .documento_nome > strong').text('CPF');
                  $('.info_chamada .documento_value').html(data.crm.cpf);
                }

                if(data.crm.cnpj !== undefined) {
                  $('.info_chamada .documento_nome > strong').text('CNPJ');
                  $('.info_chamada .documento_value').html(data.crm.cnpj);
                }

                $('.info_chamada .nome').fadeIn();
                $('.info_chamada .documento').fadeIn();
                $('.info_chamada .agencia').fadeIn();
                $('.info_chamada .conta').fadeIn();
            } else {
              $('.info-crm').css({'display':'none'});
            }*/
            if(data.tipoFilaRedirecionamento == true){
                $('.info_chamada .senha_redirecionada').fadeIn();
            }
            if(data.flgPriorizada == true){
                $('.info_chamada .senha_priorizada').fadeIn();
            }
            senhaAtual = data.senha;
            ativar('bt_chamar_voz, bt_rechamar, bt_iniciar_atendimento, bt_cancelar');
            $('.info_chamada .info_content').slideDown();
        }else{
            showMessage(data.status);
        }
    });
}

// RECHAMAR UMA SENHA
function atendimentoReChamar(){
    ativar('');
    var formData = {
        "idUsuario"         : currentUser.usuarioID,
        "token"             : currentUser.emissorToken,
        "idAtendimento"     : idAtendimento,
        'usaLocucao'        : usaLocucao
    };
    $.ajax({
        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
        url			: ATENDIMENTO+'rechamarSenha'+suffix, // the url where we want to POST
        contentType : 'application/json',
        data		: JSON.stringify(formData), // our data object
        dataType	: 'json', // what type of data do we expect back from the server
        encode		: true
    }).done(function(data) {
        if(data.idAtendimento>0){
            lastAction = 'rechamar';
            desativaRechamar();
        }
    });
}

// INICIAR UM ATENDIMENTO
function atendimentoIniciarAtendimento(){
    var formData = {
        'idUsuario'         : currentUser.usuarioID,
        'token'             : currentUser.emissorToken,
        'idAtendimento'     : idAtendimento
    };
    $.ajax({
        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
        url			: ATENDIMENTO+'inicioAtendimento'+suffix, // the url where we want to POST
        contentType : 'application/json',
        data		: JSON.stringify(formData), // our data object
        dataType	: 'json', // what type of data do we expect back from the server
        encode		: true
    }).done(function(data) {
        if(data.idAtendimento>0){
            lastAction = 'iniciar_atendimento';
            catAtendimento  = data.categoria;
            contagemAtendimentoStart();
            ativar('bt_redirecionar, bt_finalizar');
            $('.info_inicio .date_call_value').html(data.dtChamada);
            $('.info_inicio .date_init_value').html(data.dtInicioAtendimento);
            $('.info_inicio .wait_value').html(data.tme);

            var observacao = 'Nenhuma observação para este atendimento';
            if(data.obs !== ''){
              observacao = data.obs;
            }

            $('.info_obs .obs_value').html(observacao);
            $('.info_inicio').fadeIn();
            $('.info_obs').fadeIn();

            $('.box_info_atendimento').click(function(){
                $('.box_info_atendimento .info_content').slideUp();
                $(this).find('.info_content').slideToggle();
            });
            contagemBuscaStop();
        }
    });
}

// FORMATAR O TEMPO PARA O RELOGIO DE CONTAGEM DO ATENDIMENTO
function formatatempo(segs) {
    var min = 0;
    var hr  = 0;
    while(segs>=60) {
      if (segs >=60) {
          segs = segs-60;
          min = min+1;
      }
    }
    while(min>=60) {
      if (min >=60) {
          min = min-60;
          hr = hr+1;
      }
    }
    if (hr < 10) {hr = "0"+hr}
    if (min < 10) {min = "0"+min}
    if (segs < 10) {segs = "0"+segs}
    var fin = hr+":"+min+":"+segs
    return fin;
}
function contagem(){
    segsAtend++;
    var t = formatatempo(segsAtend);
    $("#timer").html(t);
}
function contagemAtendimentoStart(){
    contadorAtendimento = setInterval(contagem, 1000);
}
function contagemAtendimentoStop(){
    segsAtend = 0;
    $("#timer").html('00:00:00');
    clearInterval(contadorAtendimento);
}

// MONTA A LISTA DE CATEGORIAS NA HORA DE REDIRECIONAR UMA SENHA
function promptRedirecionar(){
    var formData = {};
    $.ajax({
        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
        url			: UTIL+'buscaCategorias'+suffix, // the url where we want to POST
        contentType : 'application/json',
        data		: JSON.stringify(formData), // our data object
        dataType	: 'json', // what type of data do we expect back from the server
        encode		: true
    }).done(function(data) {
        if(data.categoria!=''){
          openModalRedirecionar(data);
        }
    });
}

// CANCELAR UM ATENDIMENTO
function atendimentoCancelar(){
    lastAction = 'cancelar';
    desativar();
    var formData = {
        'idUsuario'         : currentUser.usuarioID,
        'token'             : currentUser.emissorToken,
        'idAtendimento'     : idAtendimento
    };
    $.ajax({
        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
        url			: ATENDIMENTO+'cancelarSenha'+suffix, // the url where we want to POST
        contentType : 'application/json',
        data		: JSON.stringify(formData), // our data object
        dataType	: 'json', // what type of data do we expect back from the server
        encode		: true
    }).done(function(data) {
        if(data.retorno == true){
            loadAtendimento();
            $('#bt_cancelar').css({'display':'none'});
            $('#bt_descancelar').css({'display':'block'});
            setTimeout(function(){
                ativar('bt_chamar_voz, bt_chamar, bt_descancelar, bt_suspender');
            }, 100);
        }
    });
}

// DESCANCELA UM ATENDIMENTO
function atendimentoDescancelar(){
    var formData = {
        'idUsuario'         : currentUser.usuarioID,
        'idAtendimento'     : idAtendimento,
        'token'             : currentUser.emissorToken
    };
    $.ajax({
        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
        url			: ATENDIMENTO+'descancelarSenha'+suffix, // the url where we want to POST
        contentType : 'application/json',
        data		: JSON.stringify(formData), // our data object
        dataType	: 'json', // what type of data do we expect back from the server
        encode		: true
    }).done(function(data) {
		    if(data.idAtendimento>0){
            lastAction = 'descancelar';
            emAtendimento   = true;
            idAtendimento   = data.idAtendimento;

            $('.info_chamada .n_atendimento_value').html(data.idAtendimento);
            $('.info_chamada .senha_value').html(data.senha);
            $('.info_chamada .categoria_value').html(data.nomeCategoria);
            $('.info_chamada .data_value').html(data.dtImpressao);

            if(data.crm.nome_cliente != undefined && data.crm.cpf !== undefined || data.crm.cnpj !== undefined && data.crm.ag !== undefined && data.crm.cc !== undefined){
                var img = $("<img class='crm-pic' src='"+ BASE_URL + 'utils/imagem/' + data.senha +"'>");
                $('.info-crm').prepend(img);

                $('.info_chamada .nome_value').html(data.crm.nome_cliente);
                $('.info_chamada .ag_value').html(data.crm.ag);
                $('.info_chamada .cc_value').html(data.crm.cc);

                if(data.crm.cpf !== undefined) {
                  $('.info_chamada .documento_nome > strong').text('CPF');
                  $('.info_chamada .documento_value').html(data.crm.cpf);
                }

                if(data.crm.cnpj !== undefined) {
                  $('.info_chamada .documento_nome > strong').text('CNPJ');
                  $('.info_chamada .documento_value').html(data.crm.cnpj);
                }

                $('.info_chamada .nome').fadeIn();
                $('.info_chamada .documento').fadeIn();
                $('.info_chamada .agencia').fadeIn();
                $('.info_chamada .conta').fadeIn();
            } else {
              $('.info-crm').css({'display':'none'});
            }

            ativar('bt_chamar_voz, bt_rechamar, bt_iniciar_atendimento, bt_cancelar');
            $('.info_chamada .info_content').slideDown();
        }
    });
}

// FINALIZAR UM ATENDIMENTO
function atendimentoFinalizar(){
    var formData = {};
    $.ajax({
        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
        url			: UTIL+'buscaObjetivo'+suffix, // the url where we want to POST
        contentType : 'application/json',
        data		: JSON.stringify(formData), // our data object
        dataType	: 'json', // what type of data do we expect back from the server
        encode		: true
    }).done(function(data) {
        if(data.objetivo!=''){
            openModalFinalizar(data);
        }
    });
}

// SUSPOENDER UM ATENDENTE
function atendimentoSuspender(){
    var formData = {};
    $.ajax({
        type		: 'POST', // define the type of HTTP verb we want to use (POST for our form)
        url			: UTIL+'buscaMotivoSuspensao'+suffix, // the url where we want to POST
        contentType : 'application/json',
        data		: JSON.stringify(formData), // our data object
        dataType	: 'json', // what type of data do we expect back from the server
        encode		: true
    }).done(function(data) {
        if(data.motivoSuspensao!==''){
            openModalSuspender(data);
        }
    });
}

// UM CONSOLE.LOG() ou IMPRIME NUMA TAG COM ID = console
function print(data){
    if(msieversion==true){
      $('#console').html(JSON.stringify(data));
    }else{
      console.log(data);
    }
}

// VERIFICA SE O QUE FOI DIGITADO É UM NUMERO OU NÃO
function isNumberKey(evt){
   var charCode = (evt.which) ? evt.which : event.keyCode
   if (charCode > 31 && (charCode < 48 || charCode > 57))
      return false;
   return true;
}

// VERIFICA SE O BROWSER É IE OU NÃO
function msieversion() {
    var ua = window.navigator.userAgent;
    var msie = ua.indexOf("MSIE ");
    if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)){
        return true;
    }else{
        return false;
    }
}
