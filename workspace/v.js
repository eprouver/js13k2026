const v = new Proxy(
  {},
  {
    get: (_, t) =>
      (...args) => {
        const e = document.createElement(t);
        args.flat(0xff).forEach((a) => {
          if (a?.constructor == Object && !a.nodeType) {
            let { style, ...r } = a;
            Object.assign(e, r);
            if (style)
              for (let k in style)
                k[0] == "-"
                  ? e.style.setProperty(k, style[k])
                  : (e.style[k] = style[k]);
          } else if (a != null) {
            e.append(a);
          }
        });
        return e;
      },
  }
);
