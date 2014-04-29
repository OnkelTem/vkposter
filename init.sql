create table if not exists tasks(
  task_id int(11) NOT NULL PRIMARY KEY,
  group_id int(11) NOT NULL,
  news_url varchar(255),
  news_title varchar(255),
  news_text varchar(255),
  news_image varchar(255),
  task_status int(2)
);

insert into tasks values
(1, 27479053, 'http://google.com', 'Quickly maintain extensible innovation', 'Quickly maintain extensible innovation whereas resource maximizing content. Distinctively innovate plug-and-play technology after intermandated', 'http://lurkmore.so/images/e/e2/Boxxyzalgoo.jpg', 0),
(2, 27479053, 'http://google.com', 'Continually extend multifunctional infomediaries', 'Continually extend multifunctional infomediaries before progressive imperatives. Phosfluorescently brand holistic imperatives whereas orthogonal technologies', 'http://lurkmore.so/images/e/e2/Boxxyzalgoo.jpg', 0);




