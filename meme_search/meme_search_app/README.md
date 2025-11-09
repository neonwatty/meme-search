# Meme search pro app

The meme search pro app is a Ruby on Rails based web application that allows users to upload, index, and query their memes. It is meant to be run in conjunction with the image-to-text service, as well as the associated postgres database container.

To run the app in isolation of these services, you can run the following command from the root of the meme_search_pro project:

```bash
./bin/rails server
```

This will start the rails server on port 3000. You can then navigate to `http://localhost:3000` in your browser to access the app.

NOTE: without the other services running, the app will not be able to index or search for memes.
