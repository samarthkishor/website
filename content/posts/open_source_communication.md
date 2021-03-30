+++
title = "The Role of Open Source in Communication"
date = 2021-03-30T16:25:00-04:00
lastmod = 2021-03-30T16:25:16-04:00
tags = ["open-source"]
draft = false
+++

This is my sixth blog post for the UVA class LPPS 4720.

In this post I'm going to get a bit meta and talk about open-source blogs on my open-source blog on open-source. For someone who wants to start writing online, there are really two options---use some sort of centralized publishing platform like [Medium](https://medium.com/) or go the decentralized route and build and host the website yourself (or use a service like [GitHub Pages](https://pages.github.com/) to host the site for you). Both options have their benefits and drawbacks, but the end result is the same in that you get your own space on the Internet to write.

Tim Berners-Lee, the person who created much of the modern World Wide Web, said in a [New York Times article](https://www.nytimes.com/2016/06/08/technology/the-webs-creator-looks-to-reinvent-it.html?ref=todayspaper&%5Fr=0) that "the web is already decentralized, [but] the problem is the dominance of one search engine, one big social network, one Twitter for microblogging. We don’t have a technology problem, we have a social problem." The Web is becoming increasingly centralized with a handful of companies controlling a vast portion of the content online, leading to a lack of diversity and transparency.

Blogs face a similar centralization problem. In the early days of the Internet, people would develop and host their blogs themselves since there were no other options. The barrier to entry was high which prevented many people from starting their own blogs. Now sites like Medium and [Substack](https://substack.com/) make it super easy to start writing online, but your content would be inextricably tied to a proprietary platform. I believe there's a middle ground but both approaches have their benefits.

Benefits of centralized blogging platforms like Medium and Substack:

-   A single website makes it easier to discover similar content from other writers. This also makes people more likely to read your blog without any advertising needed.
-   You don't have to worry about creating or maintaining a site---the platform takes care of everything other than the writing. This makes it possible for non-technical people to make their own web sites and easily distribute their content which is incredibly empowering.

Benefits of decentralized blogging using open-source tools:

-   You are in full control of your content, especially if you use a service like [Vultr](https://www.vultr.com/) or [AWS S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html) for a dedicated server to host your site and own your own domain name.
-   Static sites are also easy to move from one hosting platform to another so there's zero vendor lock-in.
-   If you use a static site generator like [Hugo](https://gohugo.io/), you can write your posts in a readable plain-text format like [Markdown](https://www.markdownguide.org/) and have the generator convert them to HTML files automatically. There is a technical learning curve but it's not too bad.
-   [Wordpress](https://wordpress.com/) is also a good open-source platform for people who don't want to use a static site generator, but you lose the important benefits of it being easy to switch to another host and the future-proof readability of plain-text.

The main reason I think that decentralized blogging is the better option for most people is that it's possible to emulate all of the benefits of the centralized approach while still preserving the essential freedoms that open-source gives you. While there is no main recommendation engine that may help increase readership, you can provide an [RSS feed](https://www.govinfo.gov/feeds) so that visitors to your site can subscribe to your content and get notified of new posts or updates. Many static site generators do this automatically. Command-line static site generators still require many technical skills that most people do not have, but there are plenty of in-depth tutorials online and it's good to know how websites work under the hood. Pretty much all that's required to make a good static site is to write some content in Markdown and run some basic terminal commands to build the site and publish it to a service like GitHub Pages which manages all the hosting (that is how I build this blog). While the barrier to entry is higher than simply making a Medium account, you have full freedom over your site and get most, if not all, of the above benefits.
