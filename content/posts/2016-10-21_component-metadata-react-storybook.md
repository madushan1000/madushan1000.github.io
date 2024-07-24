---
title: "Component Metadata & React Storybook"
author: "Madushan Nishantha"
date: 2016-10-21T17:25:06.727Z
lastmod: 2024-07-24T20:53:31+02:00

description: ""

subtitle: ""

image: "/posts/img/2016-10-21_component-metadata-react-storybook_0.png" 
images:
 - "/posts/img/2016-10-21_component-metadata-react-storybook_0.png"


aliases:
- "/component-metadata-react-storybook-ac0b218a2203"

---

#### Now you can access react-docgen info right inside your storybook

![](/posts/img/2016-10-21_component-metadata-react-storybook_0.png#layoutTextWidth)

When developing storybook addons, we usually need to access propType information and other metadata related to React component classes; however there’s no direct way to get them in React at runtime.

> Accessing **Classname.propTypes** doesn’t reveal us useful information.

Fortunately, there’s [react-docgen](https://github.com/reactjs/react-docgen) which does everything that we want. But we need to pass our React component class’s source code into that. In theory, we could integrate it with Storybook but that would be ugly.

> So, we were looking for some other solutions.

That’s where we got an idea to write a babel-plugin for react-docgen. And we did it.

See: [Babel Plugin for react-docgen](https://github.com/kadirahq/babel-plugin-react-docgen)

### React Storybook Integration

As of version 2.25.0(21, Oct 2016) of react-storybook we are shipping the above babel plugin by default. So, you could simply get react-docgen info for any of your React classes like this:

```javascript
 console.log(Button.__docgenInfo);
```

Then you could get something like this:

```json
  {
    description: 'This is an awesome looking button for React.',
    props: {
      label: {
        type: {
          name: 'string'
        },
        required: false,
        description: 'Label for the button.'
      },
      onClick: {
        type: {
          name: 'func'
        },
        required: false,
        description: 'Triggered when clicked on the button.'
      }
    }
  }
```

> You can also get react-docgen info for all of your React classes with the global variable **STORYBOOK_REACT_CLASSES.**

This integration will be really useful, when you need to access metadata inside Storybook. Specially, if you are building storybook addons you’ll love this.

We could think about a lot of new features for Storybook based on this. Here are few of them:

- Automatic style guide generation
- Generate storybook knobs automatically
- Generate variations for a given component based on propTypes

Checkout this [sample storybook](https://github.com/kadira-samples/react-docgen-sample) to see the usage of this. If you have issues, don’t forget to [bug us](https://github.com/kadirahq/react-storybook).

* * *
Written on October 21, 2016 by Madushan Nishantha.

Originally published on [Medium](https://medium.com/@madushan1000/component-metadata-react-storybook-ac0b218a2203)
