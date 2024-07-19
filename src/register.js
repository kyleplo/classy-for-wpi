import dotenv from 'dotenv';
import process from 'node:process';

/**
 * This file is meant to be run from the command line, and is not used by the
 * application server.  It's allowed to use node.js primitives, and only needs
 * to be run once.
 */

dotenv.config({ path: '.dev.vars' });

const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;

if (!token) {
  throw new Error('The DISCORD_TOKEN environment variable is required.');
}
if (!applicationId) {
  throw new Error(
    'The DISCORD_APPLICATION_ID environment variable is required.',
  );
}

const url = `https://discord.com/api/v10/applications/${applicationId}/commands`;

const response = await fetch(url, {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bot ${token}`,
  },
  method: 'PUT',
  body: JSON.stringify([
    {
      type: 1,// Slash command
      name: "schedule",
      description: "Show all registered classes for a specified user",
      options: [{
        type: 6,// USER
        name: "user",
        description: "User to get classes for (defaults to yourself)",
        required: false
      }],
    },
    {
      type: 1,// Slash command
      name: "addclass",
      description: "Add yourself to a class or sections of a class",
      options: [{
        type: 3,// STRING
        name: "class",
        description: "Class to add yourself to (ex. MA1021)",
        required: true
      },
      {
        type: 3,// STRING
        name: "section1",
        description: "Section of the class to add yourself to (ex. AL01)",
        required: true
      },
      {
        type: 3,// STRING
        name: "section2",
        description: "Additional section of the class to add yourself to (ex. AD02)",
        required: false
      },
      {
        type: 3,// STRING
        name: "section3",
        description: "Additional section of the class to add yourself to (ex. AX02)",
        required: false
      }],
    },
    {
      type: 1,// Slash command
      name: "removeclass",
      description: "Remove yourself from a class or sections of a class",
      options: [{
        type: 3,// STRING
        name: "class",
        description: "Class to remove yourself from (ex. MA1021)",
        required: true
      },
      {
        type: 3,// STRING
        name: "section1",
        description: "Section of the class to remove yourself from (ex. AL01, defaults to all sections)",
        required: false
      },
      {
        type: 3,// STRING
        name: "section2",
        description: "Additional section of the class to remove yourself from (ex. AD02)",
        required: false
      },
      {
        type: 3,// STRING
        name: "section3",
        description: "Additional section of the class to remove yourself from (ex. AX02)",
        required: false
      }],
    },
    {
      type: 1,// Slash command
      name: "class",
      description: "Show all users registered in a class or section",
      options: [{
        type: 3,// STRING
        name: "class",
        description: "Class to check registered users of (ex. MA1021)",
        required: true
      },
      {
        type: 3,// STRING
        name: "section",
        description: "Section to check registered users of (ex. AL01, defaults to all sections)",
        required: false
      }],
    },
    {
      type: 1,// Slash command
      name: "mutuals",
      description: "Show all classes you have in common with a specified user",
      options: [{
        type: 6,// USER
        name: "user",
        description: "User to get classes for",
        required: true
      }],
    },
    {
      type: 1,// Slash command,
      name: "import",
      description: "Show instructions for importing your courses from Workday"
    },
    {
      type: 2,// User context menu
      name: "Schedule"
    },
    {
      type: 2,// User context menu
      name: "Mutual Classes"
    }
  ]),
});

if (response.ok) {
  console.log('Registered all commands');
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
} else {
  console.error('Error registering commands');
  let errorText = `Error registering commands \n ${response.url}: ${response.status} ${response.statusText}`;
  try {
    const error = await response.text();
    if (error) {
      errorText = `${errorText} \n\n ${error}`;
    }
  } catch (err) {
    console.error('Error reading body from request:', err);
  }
  console.error(errorText);
}