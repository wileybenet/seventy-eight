DROP TABLE IF EXISTS `const`;

CREATE TABLE `const` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `value` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

INSERT INTO `const` (`id`, `name`, `value`)
VALUES
  (1,'salt','$2a$10$xb6OlUSgar.Lx1toO3UnB.');


DROP TABLE IF EXISTS `roles`;

CREATE TABLE `roles` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


INSERT INTO `roles` (`id`, `name`)
VALUES
  (1,'user'),
  (2,'admin');


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
  `uid` varchar(36) NOT NULL,
  `fb_id` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL DEFAULT '',
  `password` varchar(255) DEFAULT NULL,
  `post_to_fb` tinyint(1) NOT NULL DEFAULT '0',
  `joined` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `api_token` varchar(36) NOT NULL DEFAULT '',
  `active` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UIDIDX` (`uid`),
  UNIQUE KEY `USERNAMEIDX` (`username`),
  UNIQUE KEY `UNIQFBID` (`fb_id`),
  KEY `APIIDX` (`api_token`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

INSERT INTO `users` (`id`, `uid`, `fb_id`, `username`, `password`, `post_to_fb`, `joined`, `last_login`, `api_token`, `active`)
VALUES
  (1,'99999999-9999-9999-9999-9999','11111111111111','root','$2a$10$xb6OlUSgar.Lx1toO3UnB.yE0RwoqYAdLtM5MdG628o/dFmeqG3XC',1,'2015-04-06 14:14:47','2015-04-17 05:35:44','44444444-4444-4444-4444-444444444444',1);

