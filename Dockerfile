ARG php_version

FROM php:${php_version}

RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf
RUN docker-php-ext-install mysql pdo pdo_mysql && docker-php-ext-enable mysql

RUN a2enmod rewrite