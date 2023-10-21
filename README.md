Запуск
=
## PostreSQL


В базе данных должен быть пользователь **postgres** с паролем **123451** с доступом к базе данных **ShokakeDB** и хоститься по **localhost:5432**

Все таблицы и процедуры должны будут сами загрузиться при первом запуске, если это не так, то откройте **routes/api/index.js**. Все команды в комментариях. *при ошибке поставить переменной <code>validate</code> значение false*

**Ввести в терминал**
1. <code>npm install</code>
2. <code>npm start</code>

Использованные модули
=
1. fastify
2. @fastify/static
3. @fastify/autoloa
4. pg

# Сделано t.me/shokake