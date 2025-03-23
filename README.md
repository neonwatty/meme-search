# A Meme Search Engine built to self-host in Python, Ruby, and Docker

#### Please suseee [our current version of the meme search app](https://github.com/neonwatty/meme-search).  The version in this branch is greatly outdated in comparison is no longer actively maintained.

Use AI to index your memes by their content and text, making them easily retrievable for your meme warfare pleasures.

All processing - from image-to-text extraction, to vector embedding, to search - is performed locally.

<p align="center">
<img align="center" src="https://github.com/jermwatt/readme_gifs/blob/main/meme-search-pro-search-example.gif" height="325">
</p>

This repository contains code, a walkthrough notebook, and apps for indexing, searching, and easily retrieving your memes based on semantic search of their content and text.

A table of contents for the remainder of this README:

- [Meme search](#meme-search)

  - [Features](#features)
  - [Installation instructions](#installation-instructions)
  - [Index your memes](#index-your-memes)
  - [Pipeline overview](#pipeline-overview)
  - [Running tests](#running-tests)


## Meme search

### Features

This version of meme search is a simple one page app that allows you to index a directory of memes and recover them via text based search as illustrated below.

<p align="center">
<img align="center" src="https://github.com/jermwatt/readme_gifs/blob/main/meme_search.gif" height="325">
</p>

While not as feature rich as the [pro version of meme search], this rovides all the base functionality you need to organize and recover your memes. The is also simpler to install and configure, consisting of a single server / docker container.

### Installation instructions

To create a handy tool for your own memes pull the repo and install the requirements file

```sh
pip install -r requirements.txt
```

Note that the particular pinned requirements here are necessary to avoid a current nasty segmentation fault involving `sentence-transformers` [as of 6/5/2024](https://github.com/UKPLab/sentence-transformers/issues/1319).

Alternatively you can install all the requirements you need using docker via the compose file found in the repo. The command to install the above requirements and start the server using docker-compose is

```sh
docker compose up
```

After indexing your memes you can then start the server (a streamlit app), allowing you to semantically search for and retrieve your memes

```sh
python -m streamlit run meme_search/app.py
```

To start the app via docker-compose use

```sh
docker compose up
```

Note: you can drag and drop any recovered meme directly from the streamlit app to any messager app of your choice.

### Index your memes

Place any images / memes you would like indexed for the search app in this repo's subdirectory

```sh
data/input/
```

You can clear out the default test images in this location first, or leave them.

Next, click the "refresh index" button to update your index when images are added or removed from the image directory, affecting only the newly added or removed images.

<p align="center">
<img align="center" src="https://github.com/jermwatt/readme_gifs/blob/main/meme_search_refresh_button.gif" height="200">
</p>

Alternatively - at your terminal - paste the following command

```sh
python meme_search/utilities/create.py
```

or if running the server via docker us

```sh
docker exec meme_search python meme_search/utilities/create.py
```

You will see printouts at the terminal indicating success of the 3 main stages for making your memes searchable. These steps are

1.  **extract**: get text descriptions of each image, including ocr of any text on the image, using the 2 Billion parameter vision-language model [moondream](https://github.com/vikhyat/moondream)

2.  **embed**: window and embed each image's text description using a popular embedding model - [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)

3.  **index**: index the embeddings in an open source and local vector base [faiss database](https://github.com/facebookresearch/faiss) and references connecting the embeddings to their images in the greatest little db of all time - [sqlite](https://sqlite.org/)

### Pipeline overview

This meme search pipeline is written in pure Python and is built using the following open source components:

- [moondream](https://github.com/vikhyat/moondream): a small vision language model used for image captioning / extracting image text
- [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2): a very popular text embedding model
- [faiss](https://github.com/facebookresearch/faiss): a fast and efficient vector db
- [sqlite](https://sqlite.org/): the greatest database of all time, used for data indexing
- [streamlit](https://github.com/streamlit/streamlit): for serving up the app

The notebook linked to here <a href="https://colab.research.google.com/github/neonwatty/meme_search/blob/notebook-walkthrough/meme_search_walkthrough.ipynb" target="_parent"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/></a> walks through the whole process! You can also watch an overview of this walkthrough by clicking here <a href="https://www.youtube.com/watch?v=P1k1EGvoJIg" target="_parent"><img src="https://badges.aleen42.com/src/youtube.svg" alt="Youtube"/></a>.

### Running tests

Tests can be run by first installing the test requirements as

```sh
pip install -r requirements.test
```

Then the test suite can be run as

```sh
python -m pytest tests/
```