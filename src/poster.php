<?php

define('MIN_VERSION', 5.3);
round(phpversion(), 10) >= MIN_VERSION || die('Обновите PHP до ' . MIN_VERSION . ' или выше!');

include_once './common.php';

$default_config = $config;
$default_options = $options;

include_once './config.php';

$config = array_merge($default_config, $config);
$options = array_merge($default_options, $options);

unset($default_config);
unset($default_options);

include_once './functions.php';

main();

function main() {

  global $config;

  ($apps_info = json_decode(file_get_contents($config['apps_json']), TRUE)) || halt('Ошибка чтения информации о приложениях', 1);

  $groups = array();

  foreach($apps_info as $app) {
    foreach($app['groups'] as $group) {
      // Если группа уже есть, пропускаем её
      if (!isset($groups_info[$group['id']])) {
        $groups[$group['id']] = array(
          'app_id' => $app['id'],
          'access_token' => $app['token'],
          'user_id' => $app['user_id'],
          'group_name' => $group['name'],
        );
      }
    }
  };

  //print_r($groups);

  count($groups) || halt('Список групп пуст', 2);

  $db = new mysqli($config['dbhost'], $config['dbuser'], $config['dbpasswd'], $config['dbname']);

  if ($db->connect_error) {
    halt('Ошибка подключения (' . $db->connect_errno . ') ' . $db->connect_error, 3);
  }

  // Шаблончик запроса
  $sql = 'SELECT * FROM ' . $config['tasks_table'] . ' WHERE task_status %s %s %s LIMIT ' . $config['tasks_limit'] ?: 1;

  // Начинаем со списка свежака
  $result = sql_query($db, sprintf($sql, '=', STATUS_NEW, ''));
  $rows_groups['new'] = collect_rows_assoc($result);

  // Добавляем список ранее не отправленных сообщений по причинам недоступности групп
  $result = sql_query($db, sprintf($sql, 'IN (', implode(', ', array(STATUS_GROUP_NOT_AVAILABLE, STATUS_GROUP_ACCESS_DENIED, STATUS_GROUP_UNKNOWN)), ')'));
  $rows_groups['retry'] = collect_rows_assoc($result);

  // Добавляем список ранее не отправленных сообщений по причинам ошибки с размещением сообщения
  $result = sql_query($db, sprintf($sql, 'IN (', implode(', ', array(STATUS_POST_FAILED)), ')'));
  $rows_groups['retry'] = collect_rows_assoc($result, $rows_groups['retry']);

  //print_r($rows);

  foreach($rows_groups as $rows) {
    // Для каждой группы сообщений выделяем одинаковую квоту
    $quota = $config['tasks_limit'] / count($rows_groups);

    foreach($rows as $row) {
      if ($quota) {
        //print_r($row);
        $status = STATUS_OK;
        $gid = $row['group_id'];

        if (isset($groups[$gid])) {
          // Проверяем доступность группы и вообще сервиса
          list($result, $data)  = vk_groupinfo($gid, $groups[$gid]);
          if ($result) {
            // Проверяем, доступна ли группа для постинга
            if (($data['name'] == 'DELETED') || $data['is_closed'] || isset($data['deactivated'])) {
              $status = STATUS_GROUP_NOT_AVAILABLE;
            }
            else if (!$data['is_member'] || !$data['is_admin']) {
              $status = STATUS_GROUP_ACCESS_DENIED;
            }
            else {
              // Группа кажется доступной, конструируем сообщение
              $message = array(
                'title' => $row['news_title'],
                'text' => $row['news_text'],
                'url' => $row['news_url'],
                'image' => $row['news_image'],
                'group_id' => $gid,
                'attachments' => '',
              );

              // Отправляем сообщение
              if (vk_post($message, $groups[$gid])) {
                // Уменьшаем счетчик оставшихся отправок
                $quota = $quota - 1;
              }
              else {
                $status = STATUS_POST_FAILED;
              }
            }
          }
          else {
            // Была идея сохранять статус в БД:
            //   $status = STATUS_CONNECT_PROBLEM;
            // но все-таки это другой случай, поэтому просто выходим
            halt('Ошибка CURL (' . $data['errno'] . '): ' . $data['error'], 4);
            //halt('Проблема с соединением, смысла продолжать нет', 4);
          }
        }
        else {
          $status = STATUS_GROUP_UNKNOWN;
        }

        // Обновляем статус задания
        $res = $db->query(sprintf('UPDATE ' . $config['tasks_table'] . ' SET task_status = %d WHERE task_id = %d', $status, $row['task_id']));
      }
    }
  }
}

?>
