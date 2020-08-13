+++
title = "Typed APIs in Python with dataclasses and NamedTuples"
author = ["Samarth Kishor"]
date = 2020-08-13T13:35:00-04:00
lastmod = 2020-08-13T18:42:38-04:00
tags = ["programming", "python"]
draft = false
+++

Why would Python programmers ever care about types? While Python doesn't check any types statically (before running the program), it does perform extensive run-time type checking. Checking types at run-time without any implicit casts makes the language strongly-typed and dynamically-typed, as opposed to a language like C which is weakly-typed and statically-typed. This is an important distinction, but I won't go over the differences between strong and weak typing in this post.

Newer versions of Python 3 have support for type annotations which gives the programmer some more information about types. Tools like `mypy` perform some basic static type checking. However, these static type-checkers are not all-powerful and sometimes it's useful to provide some extra type-safety dynamically at run-time.

## The API {#the-api}

Imagine you're writing a Python script that uses a stock market API. The API provides a GET method called `get_stocks` which returns some JSON data containing information about three very specific stocks you're interested in (this is important because we know exactly what data the API method will return and therefore can model it). This is a bit hand-wavy, but the actual API call doesn't matter---we only care about the JSON return value.

```python
import json
from pprint import pprint

def get_stocks() -> str:
    """
    API method returning some JSON data
    """

    return json.dumps(
        {
            "TSLA": {"price": "1000.00"},
            "AMZN": {"price": "3000.00"},
            "AAPL": {"price": "400.00"}
        }
    )


stock_data = get_stocks()
pprint(stock_data)
```

```text
Python 3.8.5 (default, Jul 21 2020, 10:48:26)
[Clang 11.0.3 (clang-1103.0.32.62)] on darwin
Type "help", "copyright", "credits" or "license" for more information.
('{"TSLA": {"price": "1000.00"}, "AMZN": {"price": "3000.00"}, "AAPL": '
 '{"price": "400.00"}}')
>>> python.el: native completion setup loaded
```

We'd usually consume this API by serializing the JSON string to a Python `dict`.

```python
def get_tsla_price(stock_json_data: str) -> float:
    return float(json.loads(stock_json_data)["TSLA"]["price"])

print(get_tsla_price(stock_data))
```

```text
1000.0
```

This is alright, but remembering that the `price` field is a string can get tedious. Let's try and do better by defining the type of this JSON structure.

```python
from typing import Dict

def stocks_to_dict(stock_json_data: str) -> Dict[str, Dict[str, float]]:
    return json.loads(stock_json_data)

pprint(stocks_to_dict(stock_data))
```

```text
{'AAPL': {'price': '400.00'},
 'AMZN': {'price': '3000.00'},
 'TSLA': {'price': '1000.00'}}
```

Now a static type-checker like `mypy` can assume that `stock_data["TSLA"]["price"]` is a `float`.

What if the API changes, and the `get_stocks` method also includes the company name and the percent change (I'm not a stock market expert so this might not be the correct term) in each stock JSON object?

```python
def get_stocks() -> str:
    """
    API method returning some JSON data
    """

    return json.dumps(
        {
            "TSLA": {
                "name": "Tesla, Inc.",
                "price": "1000.00",
                "percent_change": "+2.03%"
            },
            "AMZN": {
                "name": "Amazon.com, Inc.",
                "price": "3000.00",
                "percent_change": "-1.01%"
            },
            "AAPL": {
                "name": "Apple Inc.",
                "price": "400.00",
                "percent_change": "-1.51%"
            }
        }
    )

stock_data = get_stocks()

pprint(stock_data)
```

```text
('{"TSLA": {"name": "Tesla, Inc.", "price": "1000.00", "percent_change": '
 '"+2.03%"}, "AMZN": {"name": "Amazon.com, Inc.", "price": "3000.00", '
 '"percent_change": "-1.01%"}, "AAPL": {"name": "Apple Inc.", "price": '
 '"400.00", "percent_change": "-1.51%"}}')
```

What does the type signature for the serialized `dict` even look like? We wouldn't want to keep the percent change as a string because that would be painful to work with.

This is my best guess but it's still not great.

```python
from typing import Dict, Union


def stocks_to_dict(stock_json_data: str) -> Dict[str, Dict[str, Union[float, str]]]:
    return json.loads(stock_json_data)


pprint(stocks_to_dict(stock_data))
```

```text
{'AAPL': {'name': 'Apple Inc.', 'percent_change': '-1.51%', 'price': '400.00'},
 'AMZN': {'name': 'Amazon.com, Inc.',
          'percent_change': '-1.01%',
          'price': '3000.00'},
 'TSLA': {'name': 'Tesla, Inc.',
          'percent_change': '+2.03%',
          'price': '1000.00'}}
```

Most static typecheckers for Python will not complain that this `dict` still doesn't reflect the type of the function. Let's add some type conversions:

```python
from typing import Dict, Union


def stocks_to_dict(stock_json_data: str) -> Dict[str, Dict[str, Union[float, str]]]:
    stocks_dict = json.loads(stock_json_data)
    for symbol in stocks_dict.keys():
        stocks_dict[symbol]["price"] = float(stocks_dict[symbol]["price"])
    return stocks_dict


stocks_dict = stocks_to_dict(stock_data)
pprint(stocks_dict)
print(isinstance(stocks_dict["TSLA"]["price"], float))
```

```text
{'AAPL': {'name': 'Apple Inc.', 'percent_change': '-1.51%', 'price': 400.0},
 'AMZN': {'name': 'Amazon.com, Inc.',
          'percent_change': '-1.01%',
          'price': 3000.0},
 'TSLA': {'name': 'Tesla, Inc.', 'percent_change': '+2.03%', 'price': 1000.0}}
True
```

## Dynamically adding types {#dynamically-adding-types}

This works, but I'm lazy and don't want to write a specialized `x_to_dict` function for every single API method. I want something like a dynamically type-safe C `struct`---a data-structure that automatically serializes a `dict` with the correct type conversions. Another benefit of this `struct` is that it provides some basic documentation for what kinds of fields the API returns and their types. Dictionaries are still great and definitely have their place in Python programs, but in my opinion, an object called `Stocks` is a lot more descriptive and amenable to refactoring than `Dict[str, Dict[str, Union[float, str]]]`.

Here's an example of some of the functionality that I want:

```python
stocks = Stocks(**json.loads(stock_data))
print(stocks.TSLA)  # -> nice representation of the object
print(stocks.TSLA.price)  # -> 1000.0
print(stocks.TSLA.percent_change)  # -> 0.0203
print(stocks.AMZN.percent_change)  # -> -0.0101
print(stocks.AAPL.name)  # -> "Apple Inc."
```

Notice how the `price` and `percent_change` attributes will automatically get converted to `floats`.

Let's take a stab at implementing this with a regular class:

```python
def percent_to_float(percent: str) -> float:
    """
    Converts a percentage string to a float.

    e.g. percent_to_float("+1.01%") -> 0.0101
    e.g. percent_to_float("-22.22%") -> -0.2222
    """

    neg = -1 if percent[0] == "-" else 1
    return neg * float(percent[1:-1]) / 100


class Stocks:
   def __init__(self, *args, **kwargs):
       for symbol, info in kwargs.items():
           # e.g. sets self.TSLA to an empty object
           setattr(self, symbol, type("", (), {})())
           # e.g. sets self.TSLA.name to "Tesla, Inc."
           setattr(getattr(self, symbol), "name", info["name"])
           # e.g. sets self.TSLA.price to 1000.0
           setattr(getattr(self, symbol), "price", float(info["price"]))
           # # e.g. sets self.AMZN.percent_change to -0.0101
           setattr(getattr(self, symbol), "percent_change",
                   percent_to_float(info["percent_change"]))


stocks = Stocks(**json.loads(stock_data))
print(stocks.TSLA)  # -> nice representation of the object
print(stocks.TSLA.price)  # -> 1000.0
print(stocks.TSLA.percent_change)  # -> 0.0203
print(stocks.AMZN.percent_change)  # -> -0.0101
print(stocks.AAPL.name)  # -> "Apple Inc."
```

```text
<__main__. object at 0x10cebe700>
1000.0
0.0203
-0.0101
Apple Inc.
```

This works pretty well! We've used simple metaprogramming to dynamically create class attributes at run-time, all with the correct types! The only problem is that we'd have to add a `__repr__` method to each dynamically-created object to get a nice representation of `stocks.TSLA` when printed. Remember, I'm lazy so this is clearly too much work.

## Type-safety with dataclasses {#type-safety-with-dataclasses}

Remember that this is Python and there's usually a simple answer to most problems in the standard library. Turns out that `NamedTuples` and `dataclasses` both do the trick.

```python
from dataclasses import dataclass


@dataclass
class StockInfo:
    name: str
    price: float
    percent_change: float

    def __post_init__(self):
        self.price = float(self.price)
        self.percent_change = percent_to_float(self.percent_change)


print(StockInfo(**json.loads(stock_data)["TSLA"]))
```

```text
StockInfo(name='Tesla, Inc.', price=1000.0, percent_change=0.0203)
```

That was easy! Now we can simplify the `Stock` class to use these `StockInfo` objects.

```python
class Stocks:
   def __init__(self, *args, **kwargs):
       for symbol, info in kwargs.items():
           # e.g. sets self.TSLA to StockInfo object
           setattr(self, symbol, StockInfo(**info))


stocks = Stocks(**json.loads(stock_data))
print(stocks.TSLA)  # -> nice representation of the object
print(stocks.TSLA.price)  # -> 1000.0
print(stocks.TSLA.percent_change)  # -> 0.0203
print(stocks.AMZN.percent_change)  # -> -0.0101
print(stocks.AAPL.name)  # -> "Apple Inc."
```

```text
StockInfo(name='Tesla, Inc.', price=1000.0, percent_change=0.0203)
1000.0
0.0203
-0.0101
Apple Inc.
```

As an added bonus, printing out `stocks.TSLA` gives us a nice representation of the `StockInfo` object, where before it would print out the raw Python object which isn't that helpful (of course, it's easy enough to add a `__repr__` method but that's too much work).

What happens if we try and update the stock?

```python
stocks.TSLA.name = "SpaceX, Inc."
print(stocks.TSLA)
```

```text
StockInfo(name='SpaceX, Inc.', price=1000.0, percent_change=0.0203)
```

This isn't good. I want these objects to be immutable which will prevent a whole class of potential errors.

Turns out that `dataclasses` can be immutable with a quick modification to the decorator. That should do the trick?

```python
@dataclass(frozen=True)
class StockInfo:
    name: str
    price: float
    percent_change: float

    def __post_init__(self):
        self.price = float(self.price)
        self.percent_change = percent_to_float(self.percent_change)


print(StockInfo(**json.loads(stock_data)["TSLA"]))
```

```text
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
  File "/var/folders/9k/rrglbkg540qc7_jb7g6d9l8r0000gn/T/babel-g6I1LO/python-tQy25p", line 12, in <module>
    print(StockInfo(**json.loads(stock_data)["TSLA"]))
  File "<string>", line 6, in __init__
  File "/var/folders/9k/rrglbkg540qc7_jb7g6d9l8r0000gn/T/babel-g6I1LO/python-tQy25p", line 8, in __post_init__
    self.price = float(self.price)
  File "<string>", line 4, in __setattr__
dataclasses.FrozenInstanceError: cannot assign to field 'price'
```

Looks like the frozen property gets enforced immediately after the `dataclass` gets initialized, so there's no way to change the class instance variables after they're set.

There's a workaround where you can use `super().__setattr__` to bypass the restrictions on calling `setattr` directly because of the `frozen` property. [(relevant StackOverflow post)](https://stackoverflow.com/a/54119384/7432268)

```python
@dataclass(frozen=True)
class StockInfo:
    name: str
    price: float
    percent_change: float

    def __post_init__(self):
        super().__setattr__("price", float(self.price))
        super().__setattr__("percent_change", percent_to_float(self.percent_change))


stocks = Stocks(**json.loads(stock_data))
print(stocks.TSLA)

stocks.TSLA.name = "SpaceX, Inc."  # raises an error
```

```text
StockInfo(name='Tesla, Inc.', price=1000.0, percent_change=0.0203)
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
  File "/var/folders/9k/rrglbkg540qc7_jb7g6d9l8r0000gn/T/babel-g6I1LO/python-QVEOq2", line 15, in <module>
    stocks.TSLA.name = "SpaceX, Inc."  # raises an error
  File "<string>", line 4, in __setattr__
dataclasses.FrozenInstanceError: cannot assign to field 'name'
```

Looks like this is working properly.

## Type-safety with NamedTuples {#type-safety-with-namedtuples}

If you don't want to use `dataclasses`, a `NamedTuple` works just as well. `NamedTuples` are immutable by default. We want to do the type conversions before the object is actually initialized using `__new__` because once the `NamedTuple` is created, it's immutable.

```python
from typing import NamedTuple


class StockInfo(NamedTuple):
    name: str
    price: float
    percent_change: float

    def __new__(cls, *args, **kwargs):
        kwargs["price"] = float(kwargs["price"])
        kwargs["percent_change"] = percent_to_float(kwargs["percent_change"])
        return super().__new__(cls, *args, **kwargs)


print(StockInfo(**json.loads(stock_data)["TSLA"]))
```

```text
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
  File "/var/folders/9k/rrglbkg540qc7_jb7g6d9l8r0000gn/T/babel-g6I1LO/python-lQpgrh", line 4, in <module>
    class StockInfo(NamedTuple):
  File "/usr/local/Cellar/python@3.8/3.8.5/Frameworks/Python.framework/Versions/3.8/lib/python3.8/typing.py", line 1638, in __new__
    raise AttributeError("Cannot overwrite NamedTuple attribute " + key)
AttributeError: Cannot overwrite NamedTuple attribute __new__
```

Turns out we can't modify the `__new__` method directly to convert the types, but it's possible to hack around this via sub-classing.

```python
from typing import NamedTuple


class _BaseStockInfo(NamedTuple):
    name: str
    price: float
    percent_change: float


class StockInfo(_BaseStockInfo):
    def __new__(cls, *args, **kwargs):
        kwargs["price"] = float(kwargs["price"])
        kwargs["percent_change"] = percent_to_float(kwargs["percent_change"])
        return super().__new__(cls, *args, **kwargs)


stocks = Stocks(**json.loads(stock_data))
print(stocks.TSLA)
stocks.TSLA.name = "SpaceX, Inc."  # raises an error
```

```text
StockInfo(name='Tesla, Inc.', price=1000.0, percent_change=0.0203)
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
  File "/var/folders/9k/rrglbkg540qc7_jb7g6d9l8r0000gn/T/babel-g6I1LO/python-ayaPng", line 19, in <module>
    stocks.TSLA.name = "SpaceX, Inc."  # raises an error
AttributeError: can't set attribute
```

Looks like it's working properly.

Let's just do a quick check to make sure everything works:

```python
stocks = Stocks(**json.loads(stock_data))
print(stocks.TSLA.price)  # -> 1000.0
print(stocks.TSLA.percent_change)  # -> 0.0203
print(stocks.AMZN.percent_change)  # -> -0.0101
print(stocks.AAPL.name)  # -> "Apple Inc."
```

```text
1000.0
0.0203
-0.0101
Apple Inc.
```

Now we have a nice strongly-typed wrapper object for our previously stringly-typed JSON data!

## Dataclass vs NamedTuple {#dataclass-vs-namedtuple}

### Unpacking {#unpacking}

What if we want to unpack the `StockInfo` object for multiple-assignment?

This is easy with `NamedTuples` since they work just like regular tuples.

```python
tsla = NTStockInfo(**json.loads(stock_data)["TSLA"])
print("TSLA values: ", *tsla, sep=" | ")
name, _, percent_change = tsla
print(f"percent change for {name} stock is {percent_change}")
```

```text
TSLA values:  | Tesla, Inc. | 1000.0 | 0.0203
percent change for Tesla, Inc. stock is 0.0203
```

The same can't be said for a `dataclass`.

```python
tsla = DCStockInfo(**json.loads(stock_data)["TSLA"])
name, _, percent_change = tsla
print(f"percent change for {name} stock is {percent_change}")
```

```text
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
  File "/var/folders/9k/rrglbkg540qc7_jb7g6d9l8r0000gn/T/babel-g6I1LO/python-bbTkBK", line 2, in <module>
    name, _, percent_change = tsla
TypeError: cannot unpack non-iterable StockInfo object
```

We can work around this by using the `dataclasses.astuple` function, but it's not as intuitive.

```python
import dataclasses

tsla = DCStockInfo(**json.loads(stock_data)["TSLA"])
print("TSLA values: ", *dataclasses.astuple(tsla), sep=" | ")
name, _, percent_change = dataclasses.astuple(tsla)
print(f"percent change for {name} stock is {percent_change}")
```

```text
TSLA values:  | Tesla, Inc. | 1000.0 | 0.0203
percent change for Tesla, Inc. stock is 0.0203
```

### Serializing to JSON {#serializing-to-json}

Since we're dealing with APIs, it's useful to quickly be able to serialize an object to JSON with the correct types.

```python
tsla = NTStockInfo(**json.loads(stock_data)["TSLA"])

# the _asdict() method converts a NamedTuple to a mapping type
pprint(json.dumps(tsla._asdict()))
```

```text
'{"name": "Tesla, Inc.", "price": 1000.0, "percent_change": 0.0203}'
```

```python
import dataclasses

tsla = DCStockInfo(**json.loads(stock_data)["TSLA"])
pprint(json.dumps(dataclasses.asdict(tsla)))
```

```text
'{"name": "Tesla, Inc.", "price": 1000.0, "percent_change": 0.0203}'
```

Both approaches work equally well in this case.

### Documentation {#documentation}

The `dataclass` implementation is, in my opinion, simpler to implement and has nicer built-in documentation via `help(StockInfo)`.

```nil
Help on class StockInfo in module __main__:

class StockInfo(builtins.object)
 |  StockInfo(name: str, price: float, percent_change: float) -> None
```

Since our `NamedTuple` implementation is a sub-class, we have to scroll down a bit to find the attributes of the class in the `help` output, and the type annotations are hidden away as an `OrderedDict` in the `_fields` attribute.

```nil
 |  ----------------------------------------------------------------------
 |  Data descriptors inherited from _BaseStockInfo:
 |
 |  name
 |      Alias for field number 0
 |
 |  price
 |      Alias for field number 1
 |
 |  percent_change
 |      Alias for field number 2
 |
 |  ----------------------------------------------------------------------
 |  Data and other attributes inherited from _BaseStockInfo:
 |
 |  __annotations__ = OrderedDict([('name', <class 'str'>), ('price', ... ...
 |
 |  _field_defaults = {}
 |
 |  _field_types = OrderedDict([('name', <class 'str'>),
```
