# Etapa 1: Construção e cópia dos arquivos
FROM nginx:alpine AS builder

# Copia os arquivos do site
COPY src/ /usr/share/nginx/html/

# Remover caso tenha arquivos temporários
RUN rm -f /usr/share/nginx/html/*.tmp

# Etapa 2: Configuração final do Nginx
FROM nginx:alpine

# Copia a configuração personalizada do Nginx
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copia os arquivos do site da etapa anterior
COPY --from=builder /usr/share/nginx/html /usr/share/nginx/html

# Expõe a porta 80
EXPOSE 80

# Inicia o Nginx
CMD ["nginx", "-g", "daemon off;"]