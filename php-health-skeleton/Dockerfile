# PHP 5.6 is EOL; pin by digest after first pull (Global Constraints).
FROM php:5.6-apache

# mysqli is the extension the health check needs; the real image (Plan 2) uses
# the vendored legacy-php/Dockerfile with mysql/pdo/pdo_mysql.
RUN docker-php-ext-install mysqli \
    && a2enmod rewrite

COPY public/ /var/www/html/
RUN mkdir -p /var/www/html/Distribuidor \
    && cp /var/www/html/health.php /var/www/html/Distribuidor/health.php

# Apache already listens on 80 and serves /var/www/html.
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost/health.php || exit 1
