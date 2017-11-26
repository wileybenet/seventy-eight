DROP TABLE IF EXISTS `roles`;

CREATE TABLE `roles` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


INSERT INTO `roles` (`id`, `name`)
VALUES
  (1,'user'),
  (2,'admin'),
  (3,'delete');


DROP TABLE IF EXISTS `user_roles`;

CREATE TABLE `user_roles` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) unsigned DEFAULT NULL,
  `role_id` int(11) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

INSERT INTO `user_roles` (`id`, `user_id`, `role_id`)
VALUES
  (1,1,1),
  (2,1,2);


DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL DEFAULT '',
  `password` varchar(255) DEFAULT NULL,
  `data__json` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `USERNAMEIDX` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

INSERT INTO `users` (`id`, `username`, `password`, `data__json`, `active`)
VALUES
  (1,'root','$2a$10$xb6OlUSgar.Lx1toO3UnB.yE0RwoqYAdLtM5MdG628o/dFmeqG3XC','{\"test\": true}',1),
  (2,'home','good','{\"test2\": true}',0);

DROP TABLE IF EXISTS `weird_users`;

CREATE TABLE `weird_users` (
  `weird_id` varchar(255) NOT NULL,
  `middle_name` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`weird_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

INSERT INTO `weird_users` (`weird_id`, `middle_name`)
VALUES
  ('sdf0Sjqnpfps9-jfa', 'goldwater');
