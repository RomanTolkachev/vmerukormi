# HTTPS на VPS

Основной адрес сайта — https://vetenergy.ru/login. Также доступны
https://www.vetenergy.ru/login и https://195.10.205.158/login. Nginx использует
общий бесплатный сертификат Let's Encrypt для всех трёх адресов. Из-за
сохранённого IP выбран профиль `shortlived`, сертификат действует около шести
дней. Проверка продления запускается каждые шесть часов, без остановки
приложения и без доступа к БД.
[Поддержка IP в Certbot](https://letsencrypt.org/2026/03/11/shorter-certs-certbot.html).

## Конфигурация

- `compose.prod.yml`: Nginx публикует 80/443; Certbot 5.10.0 запускается только
  явно, в профиле `maintenance`. Docker socket в контейнеры не передаётся.
- `.env.production`: `NGINX_MODE=http` для первичной настройки, `https` после
  выпуска сертификата. При HTTPS требуется `AUTH_COOKIE_SECURE=true`.
- Все production-команды Compose должны включать `--env-file .env.production`:
  обычный `env_file` сервиса не подставляет `NGINX_MODE` в пути монтирования.
  Makefile и скрипты деплоя/продления передают этот параметр.
- Сертификаты, ключи и учётная запись ACME находятся в постоянном Docker-томе
  `vmerukormi_letsencrypt`, Nginx читает его только для чтения. Не удалять том.
- Проверочные файлы HTTP-01 находятся в томе `vmerukormi_acme_challenge`.
  Порт 80 остаётся открытым для продления, остальные HTTP-запросы получают
  перенаправление 308 на HTTPS.
- `deploy/nginx/https.conf` использует сертификат с именем `vetenergy`.
  Поддерживаются TLS 1.2/1.3. Приложение по-прежнему доступно только внутри Docker.

## Первичная настройка

Команды выполняются на VPS в `/var/www/vmerukormi`. Порты 80 и 443 должны быть
доступны извне; вначале `.env.production` содержит `NGINX_MODE=http`.

```sh
compose=(docker compose --env-file .env.production -f compose.prod.yml)
"${compose[@]}" pull certbot
"${compose[@]}" up -d --no-deps nginx
"${compose[@]}" run --rm --no-deps certbot certonly --dry-run \
  --non-interactive --agree-tos --register-unsafely-without-email \
  --preferred-profile shortlived --webroot --webroot-path /var/www/certbot \
  --ip-address 195.10.205.158 --cert-name vetenergy
```

После успешной проверки повторить последнюю команду без `--dry-run`.
ACME регистрируется без email: уведомления о проблемах по почте не настроены.
Не использовать staging-сертификат для рабочего сайта.

Проверить HTTPS-конфигурацию до переключения:

```sh
NGINX_MODE=https "${compose[@]}" run --rm --no-deps nginx nginx -t
```

Затем установить в `.env.production` `NGINX_MODE=https` и
`AUTH_COOKIE_SECURE=true`, сохранив остальные значения и права файла `600`:

```sh
"${compose[@]}" up -d --no-deps nginx
"${compose[@]}" up -d --no-deps --no-build --wait --wait-timeout 180 app
"${compose[@]}" exec -T nginx nginx -t
"${compose[@]}" exec -T nginx nginx -s reload
```

Перечитывание Nginx после пересоздания приложения обновляет адрес upstream.
БД, миграции и seed для включения HTTPS не запускаются.

## Автоматическое продление

```sh
install -m 644 deploy/systemd/vetenergy-cert-renew.service /etc/systemd/system/
install -m 644 deploy/systemd/vetenergy-cert-renew.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now vetenergy-cert-renew.timer
bash deploy/renew-certificates.sh --dry-run
systemctl start vetenergy-cert-renew.service
systemctl list-timers vetenergy-cert-renew.timer
```

Таймер запускается каждые шесть часов со случайной задержкой до 30 минут и
сохраняется после перезагрузки VPS. Certbot продлевает сертификат только когда
пора. После успешного вызова скрипт проверяет и перечитывает Nginx, в том числе
если сертификат ещё не требует обновления. При ошибке выполнение прерывается,
текущий Nginx продолжает работать. Docker-установка Certbot сама по себе не
создаёт таймер: оба systemd-файла обязательны.

Проверка и диагностика:

```sh
curl -I http://195.10.205.158/login
curl -I https://195.10.205.158/login
systemctl is-enabled vetenergy-cert-renew.timer
systemctl status vetenergy-cert-renew.timer
journalctl -u vetenergy-cert-renew.service --since '7 days ago'
docker compose --env-file .env.production -f compose.prod.yml run --rm --no-deps certbot certificates
```

Не отключать проверку сертификата (`curl -k`): это скрывает ошибки доверия.
Сбой продления виден в systemd-журнале, внешнее оповещение пока не настроено.
Перед публикацией реальных данных обязательно заменить слабый начальный пароль
администратора: HTTPS не защищает от входа с известным паролем.

## Подключение vetenergy.ru

19.11.2026 домен подключён. `ns1.reg.ru`, `ns2.reg.ru`, Google DNS и
Cloudflare DNS возвращают `195.10.205.158` для основного имени и `www`.
AAAA и ограничивающих CAA-записей на момент подключения нет.
Сертификат `vetenergy` расширен на `vetenergy.ru`, `www.vetenergy.ru` и
`195.10.205.158`, затем Nginx перечитал сертификат без перезапуска приложения
или PostgreSQL. Доступ по IP сохранён.

У отдельных провайдеров старый адрес парковки может сохраняться до истечения
DNS-кэша. Ждать фиксированные сутки или двое не требуется, если авторитетные
серверы и DNS, используемый проверяющим клиентом, уже возвращают новый IP.
При подключении локальный DNS ещё временно возвращал `95.163.244.138`, хотя
Рег.ру, Google, Cloudflare и DNS на VPS уже видели новый адрес.

### DNS у регистратора

Включить DNS-обслуживание домена и указать записи:

| Тип | Имя | Значение |
| --- | --- | --- |
| A | `@` | `195.10.205.158` |
| A | `www` | `195.10.205.158` |

Если домен куплен в Рег.ру и выбран их бесплатный DNS, использовать
`ns1.reg.ru` и `ns2.reg.ru` и добавлять записи в карточке домена, в разделе
«DNS-серверы и управление зоной». Не нужны платный хостинг, SSL или перенос
домена в HOSTKEY. Если уже назначены другие DNS-серверы, записи изменяются
у соответствующего DNS-провайдера, а не обязательно у регистратора.
[Инструкция Рег.ру](https://help.reg.ru/support/dns-servery-i-nastroyka-zony/nastroyka-resursnykh-zapisey-dns/nastroyka-resursnykh-zapisey-v-lichnom-kabinete).

Для этих же имён не должно оставаться A-записей парковки или AAAA-записей
на посторонний сервер. IPv6 пока не настраиваем. Почтовые MX/TXT-записи не
трогать. Если установлено ограничение CAA, оно должно разрешать Let's Encrypt.

### Проверка и выпуск сертификата

После появления записей проверить снаружи и с VPS:

```sh
dig +short vetenergy.ru A
dig +short www.vetenergy.ru A
dig +short vetenergy.ru AAAA
dig +short www.vetenergy.ru AAAA
```

Оба A-запроса должны возвращать только `195.10.205.158`, AAAA — пустой ответ.
Пока DNS не готов, запрос сертификата не запускать. В текущей конфигурации
Nginx уже принимает HTTP-01 проверки по `/.well-known/acme-challenge/`;
приложение и БД для привязки домена менять не требуется.

На VPS расширить существующий сертификат, сохранив IP в списке имён:

```sh
cd /var/www/vmerukormi
compose=(docker compose --env-file .env.production -f compose.prod.yml)
"${compose[@]}" run --rm --no-deps certbot certonly --dry-run \
  --non-interactive --agree-tos --register-unsafely-without-email \
  --preferred-profile shortlived --webroot --webroot-path /var/www/certbot \
  --cert-name vetenergy --expand --ip-address 195.10.205.158 \
  -d vetenergy.ru -d www.vetenergy.ru
```

После успешной тестовой проверки повторить команду без `--dry-run`, затем:

```sh
"${compose[@]}" exec -T nginx nginx -t
"${compose[@]}" exec -T nginx nginx -s reload
bash deploy/renew-certificates.sh --dry-run
curl -I https://vetenergy.ru/login
curl -I https://www.vetenergy.ru/login
curl -I https://195.10.205.158/login
```

Если подключается только основной домен, убрать `-d www.vetenergy.ru` и
проверку `www` из команд; `www` до отдельного выпуска сертификата не готов.
Существующий таймер продолжит продлевать сертификат `vetenergy` уже с новыми
именами. Из-за сохранённого IP сертификат остаётся короткоживущим.
Вход по домену потребует повторной авторизации: cookies IP и домена различаются.
Почтовые ящики покупка домена и эта настройка не создают.
