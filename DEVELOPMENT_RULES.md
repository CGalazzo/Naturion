# Regras de desenvolvimento do Naturion

Estas regras devem ser seguidas em todas as próximas alterações do projeto:

1. Usar sempre a arte aprovada pelo usuário. Não recriar, substituir ou reinterpretar uma imagem sem pedido explícito.
2. Alterar somente o que foi solicitado e preservar todo o restante da versão atual.
3. Assets essenciais precisam ter validação de carregamento e um erro visível; nunca deixar uma tela vazia ou apenas com a cor de fundo.
4. Não declarar uma alteração como concluída antes de conferir os arquivos na branch `main`, validar os caminhos e testar a montagem final.
5. Desenvolver uma etapa por vez, mantendo cada versão funcional antes de avançar.
6. Antes de qualquer nova alteração, partir sempre dos arquivos mais recentes do repositório.
7. Quando uma limitação técnica impedir o uso direto de um arquivo, explicar a limitação e validar a alternativa antes de aplicá-la.

## Padrão permanente dos mapas de exploração

8. Todos os mapas de exploração devem usar o formato de diorama top-down/isométrico em 3D pixel art aprovado no Bosque Luminal: arte base em alta resolução, camada de foreground para oclusão, câmera ortográfica suave, sprites direcionais e `NearestFilter` sem blur.
9. O terreno dentro dos limites do mapa é caminhável por padrão, incluindo caminhos, terra, grama e mato. Somente elementos visualmente sólidos podem bloquear movimento: casas, pedras, árvores/troncos, água, cercas, muros, portões e objetos equivalentes.
10. Mapas construídos sobre uma arte aprovada devem criar sua colisão com `createArtworkCollisionWorld`, cadastrando retângulos, elipses ou polígonos diretamente nas coordenadas da imagem-fonte. Nunca reutilizar coordenadas de um cenário antigo nem substituir `collision.collides` por uma máscara que restrinja o jogador apenas aos caminhos.
11. A camada de colisão deve cobrir toda a composição visual, não apenas um lado ou uma parte do mapa. Cada casa, pedra, árvore/tronco, água, cerca, muro, portão e objeto sólido precisa acompanhar sua posição real na imagem, sem cobrir caminhos, grama ou mato livres.
12. Novos mapas devem preservar o mesmo sistema de protagonista, escala, animação, direção, profundidade e oclusão já aprovado, alterando apenas a arte e os obstáculos específicos da nova região.
13. Antes de publicar qualquer mapa novo, validar pelo menos: terreno e mato caminháveis; construções dos dois lados bloqueadas; pedras, água e limites bloqueados; spawn do protagonista, NPCs e Naturions fora dos obstáculos.
14. Mapas maiores que a tela devem manter a escala visual do tutorial e usar câmera ortográfica de acompanhamento com limites responsivos calculados pela extensão da arte, sem ampliar, esticar ou revelar áreas vazias ao redor da imagem.
15. Cada região jogável deve ter tela, progresso, câmera e colisões próprios. Conteúdo futuro (NPCs, Naturions, puzzles e passagens) deve ser acrescentado sobre essa base sem substituir a arte nem alterar as mecânicas compartilhadas.
