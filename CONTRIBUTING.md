# Contributing to Meme Search

Welcome to Meme Search!  We're stoked that you're interested in contributing. 

Before you get started, please take a moment to read through the guidelines below.


# How Can I Contribute?
## Reporting Bugs
If you encounter a bug or unexpected behavior in Meme Search, please help us by creating an issue in our GitHub repository. Be sure to include as much detail as possible to help us reproduce the issue.

## Suggesting Enhancements
Have an idea to improve Meme Search?  Bring it on!  You can submit your ideas by creating an issue in our GitHub repository and using the `enhancement` label.

## Contributing Code
If you're ready to contribute code to Meme Search, follow these steps:

Fork the Repository: Start by forking the repository to your GitHub account.

Clone the Repository: Clone the forked repository to your local machine.

```sh
git clone https://github.com/neonwatty/meme_search
```

Create a Branch: Create a new branch for your feature or fix.

```sh
git checkout -b feature-branch
```

Make Changes: Make your changes and ensure they follow the coding style of the project.

Test Your Changes: Test your changes to ensure they work as expected.

**Run Docker E2E Tests**: If your changes affect Docker, cross-service communication, or the image processing pipeline, you MUST run Docker E2E tests locally:

```sh
npm run test:e2e:docker
```

These tests validate the complete microservices stack (Rails + Python + PostgreSQL) and DO NOT run in CI. Local validation is required before submitting PRs.

See `playwright-docker/README.md` for details on what these tests cover.

**Run CI Locally (Optional)**: You can validate your changes match GitHub Actions CI before pushing using [act](https://github.com/nektos/act):

```sh
# Install act (macOS)
brew install act

# Run all CI jobs
act --container-architecture linux/amd64 -P ubuntu-latest=catthehacker/ubuntu:act-latest
```

Commit Your Changes: Commit your changes with a clear and descriptive commit message.

```sh
git commit -m "Add feature or fix for XYZ"
```

Push Your Changes: Push your branch to your forked repository.

```sh
git push origin feature-branch
```

Create a Pull Request: Create a pull request from your forked repository to the main repository. Be sure to provide a detailed description of your changes.

Review Process: The maintainers will review your pull request and may request changes or provide feedback.

Merge: Once approved, your pull request will be merged into the main repository. Congratulations!

# Code of Conduct

Remember to always be excellent to each other.

# Questions?
If you have any questions that aren't addressed in this guide, feel free to reach out to us by creating an issue in our GitHub repository.

Thank you for contributing to Meme Search!