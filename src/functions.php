<?php

function halt($msg, $errcode = 1) {
  fwrite(STDERR, "\033[1;31m" . $msg . "\033[0m" . "\n");
  exit($errcode);
}

function collect_rows_assoc($result, $base = array()) {
  $rows = array();
  while ($row = $result->fetch_assoc()) {
    $rows[] = $row;
  }
  if (count($base)) {
    array_splice($rows, 0, 0, $base);
  }
  return $rows;
}

function sql_query($db, $sql) {
  ($result = $db->query($sql)) || halt('Ошибка при получении данных из таблицы ' . $tasks_table, 4);
  return $result;
}

/**
 * Ф-я делает запрос к API вконтакте на предмет информации о группе
 */
function vk_groupinfo($group_id, $params) {
  list($result, $data) = vk_method('groups.getById', array(
    'access_token' => $params['access_token'],
    'group_id' => $group_id,
    //'fields' => 'city,country,place,description,wiki_page,members_count,counters,start_date,finish_date,can_post,can_see_all_posts,activity,status,contacts,links,fixed_post,verified,site',
    'fields' => '',
    //'user_id' => $params['user_id'],
    'v' => '5.21'
  ));
  return array($result, reset($data));
}

/**
 * Ф-я размещает пост в заданной группе
 */
function vk_post($message, $params) {
  list($result, $data) = vk_method('wall.post', array(
    'access_token' => $params['access_token'],
    'owner_id' => '-'. $message['group_id'],
    'message' => $message['text'],
    'from_group' => $message['from_group'],
    'signed' => $message['signed'],
    'friends_only' => $message['friends_only'],
    'attachments' => $message['attachments'],
    'expires_in' => '0',
  ));
  return array($result, $data);
}

function vk_method($method, $params) {
  $url = 'https://api.vk.com/method/'.$method.'?';
  $curl = curl_init();

  curl_setopt_array($curl, array(
    CURLOPT_POST            => true,
    CURLOPT_RETURNTRANSFER  => true,
    CURLOPT_HEADER          => false,
    CURLOPT_SSL_VERIFYPEER  => true,
    CURLOPT_SSL_VERIFYHOST  => 2,
    //CURLOPT_CAINFO      => getcwd()."/components/com_socialcrossposting/helpers/cacert.pem",
    //CURLOPT_CAPATH      => getcwd()."/components/com_socialcrossposting/helpers/",
    CURLOPT_ENCODING        => "",
    CURLOPT_USERAGENT       => "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:21.0) Gecko/20100101 Firefox/21.0",
  ));
  curl_setopt($curl, CURLOPT_URL, $url);
  curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($params));

  $response = curl_exec($curl);
  $result = array();

  if ($response === FALSE) {
    $result = array('success' => FALSE) + array('data' => array(
      'errno' => curl_errno($curl),
      'error' => curl_error($curl),
    ));
  }
  else {
    $result = array(TRUE, reset(json_decode($response, TRUE)));
  }
  curl_close($curl);
  return $result;
}


?>