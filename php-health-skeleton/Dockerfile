# PHP 5.6 is EOL; pin by digest after first pull (Global Constraints).
FROM php:5.6-apache

# mysqli is the extension the health check needs; the real image (Plan 2) uses
# the vendored legacy-php/Dockerfile with mysql/pdo/pdo_mysql.
RUN docker-php-ext-install mysqli \
    && a2enmod rewrite

COPY public/ /var/www/html/
# Give each legacy-app path prefix a health.php AND an index.php, so both
# `/Distribuidor/health.php` and the bare `/Distribuidor/` return 200 (Apache
# serves index.php; without an index file a bare dir returns 403). The real
# combined image (Plan 2) replaces these with the actual Distribuidor/SerfelWeb.
RUN for d in Distribuidor SerfelWeb; do \
      mkdir -p "/var/www/html/$d" && \
      cp /var/www/html/health.php "/var/www/html/$d/health.php" && \
      printf '<?php echo "rehost skeleton — %s slot (replaced by the real app in Plan 2)\\n";' "$d" > "/var/www/html/$d/index.php"; \
    done

# Apache already listens on 80 and serves /var/www/html.
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost/health.php || exit 1
