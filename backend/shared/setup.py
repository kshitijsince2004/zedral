from setuptools import find_packages, setup

setup(
    name="zedral-common",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "asyncpg>=0.29",
        "aiokafka>=0.10",
        "fastapi>=0.115",
        "httpx>=0.27",
        "pydantic>=2.7",
    ],
)
