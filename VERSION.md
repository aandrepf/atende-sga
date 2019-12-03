## V 1.5.2
- FIX: Ao incluir a autenticação no modal o atendende pode enviar apertando a tecla enter do teclado
- NEW: Inclusão do botão '#' o qual se refere a um grupo de Fila Única caso as categorias estejam inseridas nesse modelo
- NEW: Ao passar o mouse por cima do botão '#' ele mostra no modal quais categorias estam inseridas na modalidade Fila Unica
- CHANGE: Validação da politica foi modificada para validar também a regra do Fila Unica de adicionar uma #

## V 1.5.1
- NEW : Inclusão de processo de chamar senha da modalidade FILA UNICA, onde ao chamar a senha ele abre um modal onde o atendente deve digitar o valor da autenticação que se encontra no ticket para chamar a senha
- FIX: Método de descancelar a senha ao ser acionado estava mostrando uma img quebrada na info do crm, foi ajustado para entender que se não tem imagem não deve mostrar a mesma.

## V 1.4.0
- CHANGE: adicionado no login campo hostname onde valida se o user preencheu o campo hostename. Caso não seja preenchido o valor que ele assume é o da matricula
- CHANGE: configuração de politica para que o mesmo aceite filas com 2 letras, onde ele diferencia por parentese.
- CHANGE: validação da política foi modificada para aceitar filas com parenteses dentro de chave e colchete da regra nova de configuração

## V 1.3.24
- FIX: melhorias de look feel
- FIX: calculo total de agencia e atendente
- FIX: cadastro de paineis inserção e remoção dos paineis escolhidos
- FIX: evento de descancelar senha retornando dados do CRM

## V 1.3.16
- FIX: compatibilidade com IE

## V 1.3.13
- FIX: calculo total da agencia e atendente
- FIX: na seleção de paineis no cadastro de categorias nas configurações
- FIX: para filtrar a lista do redirecionamento para o mesmo tipo de prioridade
- FIX: retornar as informações do CRM (caso tenha) ao descancelar uma senha

## V 1.3.4
- FIX: mensagens de requisição completa

## V 1.3.2
- FIX: cadastro de matricula para aceitar caracteres alfa-numéricos na tabela de USUARIO e terminais
- FIX: inputs de matricula para limitar a 8 caracteres
- FIX: atributos onde a matricula existe para upperCase

## V 1.0.43
- Release Inicial. Exportado pastas e estrutura geral de arquivos da aplicação.