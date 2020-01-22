# Atende SGA

Aplicação de atendimento de senhas desenvolvida com jQuery 1.12.4 para atender demanda de solicitação dos bancos por conta de utilizarem IE 8.

Foi incluso um tempo depois o Electron para gerar uma aplicação desktop para que a aplicação pudesse atender ao requisito de usuario possa se logar utilizando a matricula e o hostname da maquina, visto que, na regra de negócio os atendimentos e eventos estam vinculadas à posição em que o usuário se loga.

A aplicação conta com recursos como:

- :computer: Tela de atendimento ao usuário podendo dependendo de uma variável, exibir ou não informações do cliente. Ele tem um item que se integra com o painel de chamada que consiste em chamar uma senha com voz :speaker: ou não;

- :watch: Tela de suspensão onde, se o atendente não estiver em atendimento ele pode pausar seu atendimento por algum motivo, seja almoço e etc.

- :bar_chart: Tela de monitoramento onde consiste em monitorar status de senhas por tempo de espera, monitorar histórico de login dos usuarios, e histórico de senhas que foram atendidas com seus respectivos status de atendimento (somente disponível para um tipo específico de usuário, no caso MONITOR/GERENTE).

- :wrench: Tela de configuração onde podemos configurar usuarios, terminais, politicas de atendimento, paineis de chamada de senha etc. Também somente disponível para um tipo específico de usuário, no caso MONITOR/GERENTE.

Com o Electron a aplicação consegue coletar dados como rede, hostname da maquina em que está sendo executado, se conectar com uma impressora térmica que imprime senhas em caso de perda de conexão com a rede, ou imprimir autenticação de horario de atendimento.

